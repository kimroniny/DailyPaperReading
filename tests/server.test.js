const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { KEY_NAME, createService, extractPdfText, buildInterpretPrompt } = require("../server/service");

const ROOT = path.join(__dirname, "..");
const PAPER_ID = "2611.22457";

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function request(server, method, pathname, body) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch (error) {
    data = text;
  }
  return { status: response.status, data };
}

async function boot(fetchImpl, extra) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dpr-"));
  const service = createService({
    root: ROOT,
    dataDir,
    fetch: fetchImpl,
    autoPoll: false,
    cursorKey: "unit-test-key",
    extractText: async () => "extracted paper text",
    ...(extra || {}),
  });
  const server = await listen(service.handle);
  return {
    service,
    server,
    async stop() {
      service.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    type: "basic",
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(data),
    arrayBuffer: async () => Buffer.from(JSON.stringify(data)),
  };
}

describe("paper service", () => {
  it("uses the named Cursor key and keeps it out of the prompt", () => {
    assert.equal(KEY_NAME, "dailypaperreading-parse");
    const prompt = buildInterpretPrompt({ title: "A", authors: ["B"], venue: "arXiv", year: 2026, url: "https://example.test" }, "正文");
    assert.match(prompt, /只输出解读正文/);
    assert.equal(prompt.includes(KEY_NAME), false);
  });

  it("serves health, the site, and a paper that is not saved yet", async () => {
    const app = await boot(async () => {
      throw new Error("unexpected fetch");
    });
    try {
      const health = await request(app.server, "GET", "/health");
      assert.equal(health.status, 200);
      assert.deepEqual(health.data, { ok: true });
      const home = await request(app.server, "GET", "/");
      assert.equal(home.status, 200);
      assert.match(home.data, /每日读论文/);
      const hidden = await request(app.server, "GET", "/server/service.js");
      assert.equal(hidden.status, 404);
      const escaped = await request(app.server, "GET", "/css/../package.json");
      assert.equal(escaped.status, 404);
      const paper = await request(app.server, "GET", `/api/papers/${PAPER_ID}`);
      assert.equal(paper.status, 200);
      assert.deepEqual(paper.data.saved, []);
      assert.equal(paper.data.source, null);
      const missing = await request(app.server, "GET", "/api/papers/missing-paper");
      assert.equal(missing.status, 404);
    } finally {
      await app.stop();
    }
  });

  it("writes the original text when the sheet accepts it, and falls back to the seven fields", async () => {
    const calls = [];
    const app = await boot(async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      if (calls.at(-1).body.full_text) return jsonResponse(200, { code: 1, message: "字段过多" });
      return jsonResponse(200, { code: 0, data: { task_id: "task-1" } });
    });
    try {
      const uploaded = await request(app.server, "POST", `/api/papers/${PAPER_ID}/upload`, {
        filename: "note.txt",
        mime: "text/plain",
        dataBase64: Buffer.from("手动上传的原文").toString("base64"),
      });
      assert.equal(uploaded.status, 200);
      assert.equal(uploaded.data.chars, "手动上传的原文".length);
      const imported = await request(app.server, "POST", `/api/papers/${PAPER_ID}/wps`, { sheetId: "security" });
      assert.equal(imported.status, 200);
      assert.equal(imported.data.withFullText, false);
      assert.equal(imported.data.paper.saved[0].label, "区块链安全防控");
      assert.equal(calls.length, 2);
      assert.equal(calls[0].body.full_text, "手动上传的原文");
      assert.equal(calls[1].body.full_text, undefined);
      assert.deepEqual(Object.keys(calls[1].body), [
        "title",
        "source",
        "ref_bib",
        "url",
        "pdf_url",
        "abstract",
        "published_date",
      ]);
      calls.length = 0;
      const removed = await request(app.server, "POST", `/api/papers/${PAPER_ID}/wps/remove`, { sheetId: "security" });
      assert.equal(removed.status, 200);
      assert.equal(removed.data.sheetDeleted, false);
      assert.equal(removed.data.paper.saved.length, 0);
      assert.equal(calls.length, 0);
    } finally {
      await app.stop();
    }
  });

  it("asks for an upload when the original is not a PDF", async () => {
    const app = await boot(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "text/html; charset=utf-8" },
      arrayBuffer: async () => Buffer.from("<html>please log in</html>"),
      text: async () => "",
    }));
    try {
      const blocked = await request(app.server, "POST", `/api/papers/${PAPER_ID}/source`);
      assert.equal(blocked.status, 409);
      assert.equal(blocked.data.reason, "paywall");
      const paper = await request(app.server, "GET", `/api/papers/${PAPER_ID}`);
      assert.equal(paper.data.source, null);
    } finally {
      await app.stop();
    }
  });

  it("stores downloaded PDF text and then asks Cursor to read it", async () => {
    const calls = [];
    const app = await boot(async (url, init) => {
      const target = String(url);
      calls.push({ url: target, init });
      if (target.includes("arxiv.org")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/pdf" },
          arrayBuffer: async () => Buffer.from("%PDF-1.7 fake"),
          text: async () => "",
        };
      }
      if (target === "https://api.cursor.com/v1/agents") {
        return jsonResponse(200, {
          agent: { id: "bc-test", latestRunId: "run-test" },
          run: { id: "run-test", status: "CREATING" },
        });
      }
      if (target.endsWith("/runs/run-test")) {
        return jsonResponse(200, { status: "FINISHED", result: "这是解读" });
      }
      if (target.endsWith("/archive")) return jsonResponse(200, {});
      throw new Error(`unexpected ${target}`);
    });
    try {
      const downloaded = await request(app.server, "POST", `/api/papers/${PAPER_ID}/source`);
      assert.equal(downloaded.status, 200);
      assert.equal(downloaded.data.paper.source.kind, "download");
      assert.equal(downloaded.data.paper.source.chars, "extracted paper text".length);

      const missingKey = await boot(async () => {
        throw new Error("should not call");
      }, { cursorKey: "" });
      try {
        await request(missingKey.server, "POST", `/api/papers/${PAPER_ID}/upload`, {
          filename: "a.txt",
          mime: "text/plain",
          dataBase64: Buffer.from("有原文").toString("base64"),
        });
        const denied = await request(missingKey.server, "POST", `/api/papers/${PAPER_ID}/interpret`);
        assert.equal(denied.status, 503);
        assert.match(denied.data.error, /dailypaperreading-parse/);
      } finally {
        await missingKey.stop();
      }

      const started = await request(app.server, "POST", `/api/papers/${PAPER_ID}/interpret`);
      assert.equal(started.status, 202);
      assert.equal(started.data.paper.interpretation.status, "running");
      const busy = await request(app.server, "POST", `/api/papers/${PAPER_ID}/interpret`);
      assert.equal(busy.status, 409);
      const created = calls.find((call) => call.url === "https://api.cursor.com/v1/agents");
      const body = JSON.parse(created.init.body);
      assert.equal(body.repos, undefined);
      assert.equal(body.autoCreatePR, false);
      assert.match(body.prompt.text, /extracted paper text/);
      assert.equal(body.prompt.text.includes("unit-test-key"), false);
      assert.equal(created.init.headers.Authorization, `Basic ${Buffer.from("unit-test-key:").toString("base64")}`);

      await app.service.tick();
      const done = await request(app.server, "GET", `/api/papers/${PAPER_ID}`);
      assert.equal(done.data.interpretation.status, "done");
      assert.equal(done.data.interpretation.text, "这是解读");
      assert.equal(calls.some((call) => call.url.endsWith("/archive")), true);
    } finally {
      await app.stop();
    }
  });

  it("reads text out of a small PDF", async () => {
    const pdf = Buffer.from(`%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Count 1 /Kids [3 0 R] >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 57 >>stream
BT /F1 18 Tf 36 100 Td (Hello paper) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
trailer<< /Root 1 0 R >>
%%EOF
`);
    const text = await extractPdfText(pdf);
    assert.match(text, /Hello paper/);
  });
});
