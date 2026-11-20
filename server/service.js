const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { WPS_SHEETS, postPaperToWps, sheetById } = require("../js/wps");

const KEY_NAME = "dailypaperreading-parse";
const CURSOR_API = "https://api.cursor.com";
const SOURCE_LIMIT = 30 * 1024 * 1024;
const BODY_LIMIT = 40 * 1024 * 1024;

function httpError(status, message, extra) {
  const error = new Error(message);
  error.status = status;
  if (extra) Object.assign(error, extra);
  return error;
}

function scrub(text, secret) {
  let out = String(text || "");
  if (secret) out = out.split(secret).join("[secret]");
  return out.slice(0, 500);
}

function safeId(id) {
  const text = String(id || "");
  if (!text || text.includes("/") || text.includes("\\") || text.includes("..")) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(text)) return "";
  return text;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function extractPdfText(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const packageJson = require.resolve("pdfjs-dist/package.json");
  const fontDir = path.join(path.dirname(packageJson), "standard_fonts") + path.sep;
  const doc = await pdfjs
    .getDocument({
      data: new Uint8Array(bytes),
      disableWorker: true,
      isEvalSupported: false,
      standardFontDataUrl: pathToFileURL(fontDir).href,
    })
    .promise;
  const lines = [];
  try {
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      let line = "";
      for (const item of content.items) {
        line += item.str || "";
        if (item.hasEOL) {
          lines.push(line);
          line = "";
        }
      }
      if (line) lines.push(line);
      lines.push("");
    }
  } finally {
    await doc.destroy();
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildInterpretPrompt(paper, text) {
  const item = paper || {};
  return [
    "请用中文解读下面这篇论文。只输出解读正文，不要修改任何文件，不要调用工具，不要创建分支或 pull request。",
    "解读包括：这篇论文在解决什么问题；方法；主要结果；局限；和软件安全或区块链安全的关系。",
    "",
    `题目：${item.title || ""}`,
    `作者：${Array.isArray(item.authors) ? item.authors.join(", ") : ""}`,
    `来源：${item.venue || ""} ${item.year || ""}`,
    `链接：${item.url || ""}`,
    "",
    "论文原文：",
    String(text || "").slice(0, 100000),
  ].join("\n");
}

function createService(options) {
  const settings = options || {};
  const root = settings.root || path.join(__dirname, "..");
  const dataDir = settings.dataDir || path.join(root, "var");
  const fetchImpl = settings.fetch || fetch;
  const now = settings.now || (() => new Date().toISOString());
  const extractText = settings.extractText || extractPdfText;
  const stateFile = path.join(dataDir, "state.json");
  let catalog = null;
  let catalogStamp = "";
  let chain = Promise.resolve();
  const jobs = new Map();
  let startingInterpret = false;

  function cursorKey() {
    if (Object.prototype.hasOwnProperty.call(settings, "cursorKey")) return String(settings.cursorKey || "");
    return String(process.env[KEY_NAME] || "");
  }

  function ensureDir() {
    fs.mkdirSync(path.join(dataDir, "sources"), { recursive: true });
  }

  function loadState() {
    ensureDir();
    const state = readJson(stateFile, { papers: {} });
    if (!state || typeof state !== "object" || !state.papers || typeof state.papers !== "object") {
      return { papers: {} };
    }
    return state;
  }

  function writeState(state) {
    ensureDir();
    const tmp = `${stateFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, stateFile);
  }

  function updateState(fn) {
    const run = chain.then(() => {
      const state = loadState();
      const result = fn(state);
      writeState(state);
      return result;
    });
    chain = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  function loadCatalog() {
    const manifestPath = path.join(root, "data", "manifest.json");
    const stamp = String(fs.statSync(manifestPath).mtimeMs);
    if (catalog && catalogStamp === stamp) return catalog;
    const manifest = readJson(manifestPath, { dates: [] });
    const map = new Map();
    for (const date of manifest.dates || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const day = readJson(path.join(root, "data", `${date}.json`), { papers: [] });
      for (const paper of day.papers || []) {
        if (!paper || !paper.id || map.has(paper.id)) continue;
        map.set(paper.id, { ...paper, addedOn: day.date || paper.addedOn || date });
      }
    }
    catalog = map;
    catalogStamp = stamp;
    return map;
  }

  function findPaper(id) {
    const key = safeId(id);
    if (!key) return null;
    return loadCatalog().get(key) || null;
  }

  function rowOf(state, id) {
    if (!state.papers[id]) state.papers[id] = { sheets: {} };
    if (!state.papers[id].sheets) state.papers[id].sheets = {};
    return state.papers[id];
  }

  function sourcePath(id) {
    return path.join(dataDir, "sources", `${safeId(id)}.txt`);
  }

  function readSource(id) {
    try {
      return fs.readFileSync(sourcePath(id), "utf8");
    } catch (error) {
      return "";
    }
  }

  function publicPaper(id) {
    const paper = findPaper(id);
    if (!paper) return null;
    const state = loadState();
    const row = state.papers[paper.id] || { sheets: {} };
    const saved = WPS_SHEETS.filter((sheet) => row.sheets && row.sheets[sheet.id]).map((sheet) => ({
      id: sheet.id,
      label: sheet.label,
      at: row.sheets[sheet.id].at || "",
      withFullText: Boolean(row.sheets[sheet.id].withFullText),
    }));
    const interpretation = row.interpretation || { status: "idle", text: "", error: "" };
    return {
      id: paper.id,
      title: paper.title || "",
      saved,
      source: row.source || null,
      interpretation: {
        status: interpretation.status || "idle",
        text: interpretation.text || "",
        error: interpretation.error || "",
      },
    };
  }

  async function importToWps(id, sheetId) {
    const paper = findPaper(id);
    const sheet = sheetById(sheetId);
    if (!paper) throw httpError(404, "没有这篇论文");
    if (!sheet) throw httpError(400, "未知的表");
    const text = readSource(paper.id).trim();
    let response = null;
    let usedText = false;
    try {
      response = await postPaperToWps(paper, {
        sheetId,
        server: true,
        fetch: fetchImpl,
        fullText: text || undefined,
        retries: 2,
      });
      usedText = Boolean(text);
    } catch (error) {
      if (!(text && error && error.wps)) throw error;
      response = await postPaperToWps(paper, {
        sheetId,
        server: true,
        fetch: fetchImpl,
        retries: 2,
      });
    }
    const taskId =
      response && response.wpsData && response.wpsData.data && response.wpsData.data.task_id
        ? String(response.wpsData.data.task_id)
        : "";
    await updateState((state) => {
      const row = rowOf(state, paper.id);
      row.sheets[sheetId] = { at: now(), taskId, withFullText: usedText };
    });
    return {
      saved: true,
      sheetId,
      label: sheet.label,
      withFullText: usedText,
      paper: publicPaper(paper.id),
    };
  }

  async function removeFromWps(id, sheetId) {
    const paper = findPaper(id);
    const sheet = sheetById(sheetId);
    if (!paper) throw httpError(404, "没有这篇论文");
    if (!sheet) throw httpError(400, "未知的表");
    await updateState((state) => {
      const row = rowOf(state, paper.id);
      delete row.sheets[sheetId];
    });
    return {
      removed: true,
      sheetDeleted: false,
      message: "已从本服务的保存记录里去掉。现在用的导入地址只会往表里新增一行，删不掉已经写进去的那一行。",
      paper: publicPaper(paper.id),
    };
  }

  function looksLikeHtml(bytes, type) {
    const mime = String(type || "").toLowerCase();
    if (mime.includes("text/html")) return true;
    const head = bytes.slice(0, 200).toString("utf8").trim().toLowerCase();
    return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head");
  }

  async function storeText(id, text, meta) {
    const body = String(text || "").trim();
    if (!body) throw httpError(409, "文件里没有可用的文字");
    ensureDir();
    fs.writeFileSync(sourcePath(id), body);
    await updateState((state) => {
      const row = rowOf(state, id);
      row.source = {
        at: now(),
        chars: body.length,
        kind: meta.kind,
        filename: meta.filename || "",
      };
    });
    return { ok: true, chars: body.length, paper: publicPaper(id) };
  }

  async function downloadSource(id) {
    const paper = findPaper(id);
    if (!paper) throw httpError(404, "没有这篇论文");
    const url = paper.pdf || "";
    if (!url) throw httpError(400, "没有原文地址，请上传文件");
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "DailyPaperReading/1.0",
        Accept: "application/pdf,text/plain,*/*",
      },
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > SOURCE_LIMIT) throw httpError(413, "原文太大");
    const type = response.headers.get("content-type") || "";
    const pdf = bytes.slice(0, 5).toString() === "%PDF-" || String(type).includes("application/pdf");
    if (!response.ok || looksLikeHtml(bytes, type) || !pdf) {
      throw httpError(409, "原文下载不了，请手动上传", { reason: "paywall" });
    }
    const text = await extractText(bytes);
    return storeText(paper.id, text, { kind: "download", filename: `${paper.id}.pdf` });
  }

  async function saveUpload(id, payload) {
    const paper = findPaper(id);
    if (!paper) throw httpError(404, "没有这篇论文");
    const body = payload || {};
    let bytes;
    try {
      bytes = Buffer.from(String(body.dataBase64 || ""), "base64");
    } catch (error) {
      throw httpError(400, "文件内容读不出来");
    }
    if (!bytes.length) throw httpError(400, "没有收到文件");
    if (bytes.length > SOURCE_LIMIT) throw httpError(413, "文件太大");
    const filename = String(body.filename || "");
    const mime = String(body.mime || "");
    const pdf = mime.includes("pdf") || filename.toLowerCase().endsWith(".pdf") || bytes.slice(0, 5).toString() === "%PDF-";
    const text = pdf ? await extractText(bytes) : bytes.toString("utf8");
    return storeText(paper.id, text, { kind: "upload", filename });
  }

  async function cursorJson(url, key, init) {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
        ...(init && init.headers),
      },
    });
    const text = typeof response.text === "function" ? await response.text() : "";
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      const detail =
        (data && data.message) ||
        (data && typeof data.error === "string" && data.error) ||
        (data && data.error && data.error.message) ||
        text ||
        "Cursor 请求失败";
      const message = scrub(detail, key);
      throw httpError(response.status || 502, message || "Cursor 请求失败");
    }
    return data || {};
  }

  async function startInterpret(id) {
    const paper = findPaper(id);
    if (!paper) throw httpError(404, "没有这篇论文");
    const key = cursorKey();
    if (!key) throw httpError(503, "没有找到名为 dailypaperreading-parse 的密钥");
    const text = readSource(paper.id).trim();
    if (!text) throw httpError(409, "请先下载或上传原文");
    const busy = Object.values(loadState().papers).some((row) => row.interpretation && row.interpretation.status === "running");
    if (startingInterpret || busy) throw httpError(409, "已有一篇论文在解读");
    startingInterpret = true;
    try {
      const created = await cursorJson(`${CURSOR_API}/v1/agents`, key, {
        method: "POST",
        body: JSON.stringify({
          prompt: { text: buildInterpretPrompt(paper, text) },
          autoCreatePR: false,
        }),
      });
      const agentId = created.agent && created.agent.id;
      const runId = (created.run && created.run.id) || (created.agent && created.agent.latestRunId);
      if (!agentId || !runId) throw httpError(502, "Cursor 没有返回解读任务");
      await updateState((state) => {
        const row = rowOf(state, paper.id);
        row.interpretation = {
          status: "running",
          text: "",
          error: "",
          agentId,
          runId,
          startedAt: now(),
        };
      });
      jobs.set(paper.id, { status: "running", agentId, runId });
      return { status: "running", paper: publicPaper(paper.id) };
    } finally {
      startingInterpret = false;
    }
  }

  async function refreshInterpret(id) {
    const state = loadState();
    const row = state.papers[id];
    const job = row && row.interpretation;
    if (!job || job.status !== "running" || !job.agentId || !job.runId) return publicPaper(id);
    const key = cursorKey();
    if (!key) return publicPaper(id);
    const run = await cursorJson(`${CURSOR_API}/v1/agents/${job.agentId}/runs/${job.runId}`, key, { method: "GET" });
    const status = String(run.status || "");
    if (!["FINISHED", "ERROR", "CANCELLED", "EXPIRED"].includes(status)) return publicPaper(id);
    const text = String(run.result || "").trim();
    const failed = status !== "FINISHED" || !text;
    await updateState((next) => {
      const current = rowOf(next, id);
      current.interpretation = {
        status: failed ? "error" : "done",
        text: failed ? "" : text,
        error: failed ? scrub(text || `解读结束：${status}`, key) : "",
        agentId: job.agentId,
        runId: job.runId,
        startedAt: job.startedAt || "",
        finishedAt: now(),
      };
    });
    jobs.delete(id);
    try {
      await cursorJson(`${CURSOR_API}/v1/agents/${job.agentId}/archive`, key, { method: "POST", body: "{}" });
    } catch (error) {
      // 解读正文已经记下，归档失败不影响阅读。
    }
    return publicPaper(id);
  }

  async function tick() {
    const state = loadState();
    const pending = Object.keys(state.papers).filter((id) => state.papers[id].interpretation?.status === "running");
    for (const id of pending) {
      try {
        await refreshInterpret(id);
      } catch (error) {
        await updateState((next) => {
          const current = rowOf(next, id);
          current.interpretation = {
            ...(current.interpretation || {}),
            status: "error",
            error: scrub(error.message, cursorKey()) || "解读失败",
          };
        });
        jobs.delete(id);
      }
    }
  }

  let timer = null;
  if (settings.autoPoll !== false) {
    timer = setInterval(() => {
      tick().catch(() => {});
    }, 4000);
    if (timer.unref) timer.unref();
  }

  function contentType(file) {
    if (file.endsWith(".html")) return "text/html; charset=utf-8";
    if (file.endsWith(".css")) return "text/css; charset=utf-8";
    if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (file.endsWith(".json")) return "application/json; charset=utf-8";
    if (file.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
  }

  function send(res, status, body, type) {
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
    res.writeHead(status, {
      "Content-Type": type || "application/json; charset=utf-8",
      "Content-Length": payload.length,
      "Cache-Control": "no-store",
    });
    res.end(payload);
  }

  function sendJson(res, status, data) {
    send(res, status, JSON.stringify(data));
  }

  function serveStatic(req, res, url) {
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (relative.includes("\0")) {
      send(res, 404, "not found", "text/plain; charset=utf-8");
      return;
    }
    const file = path.resolve(root, relative);
    const allowed = [path.join(root, "index.html"), path.join(root, "favicon.svg"), path.join(root, "css"), path.join(root, "js"), path.join(root, "data")];
    const inside = allowed.some((dir) => file === dir || file.startsWith(dir + path.sep));
    if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      send(res, 404, "not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, fs.readFileSync(file), contentType(file));
  }

  async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > BODY_LIMIT) throw httpError(413, "文件太大");
      chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (error) {
      throw httpError(400, "请求正文不是 JSON");
    }
  }

  async function handle(req, res) {
    const url = new URL(req.url, "http://127.0.0.1");
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      const match = /^\/api\/papers\/([^/]+)(?:\/(wps(?:\/remove)?|source|upload|interpret))?$/.exec(url.pathname);
      if (match) {
        const id = safeId(decodeURIComponent(match[1]));
        const action = match[2] || "";
        if (!id) throw httpError(404, "没有这篇论文");
        if (req.method === "GET" && !action) {
          const paper = publicPaper(id);
          if (!paper) throw httpError(404, "没有这篇论文");
          sendJson(res, 200, paper);
          return;
        }
        if (req.method === "GET" && action === "interpret") {
          const paper = publicPaper(id);
          if (!paper) throw httpError(404, "没有这篇论文");
          sendJson(res, 200, paper.interpretation);
          return;
        }
        if (req.method === "POST" && action === "wps") {
          const body = await readJsonBody(req);
          sendJson(res, 200, await importToWps(id, body.sheetId));
          return;
        }
        if (req.method === "POST" && action === "wps/remove") {
          const body = await readJsonBody(req);
          sendJson(res, 200, await removeFromWps(id, body.sheetId));
          return;
        }
        if (req.method === "POST" && action === "source") {
          sendJson(res, 200, await downloadSource(id));
          return;
        }
        if (req.method === "POST" && action === "upload") {
          sendJson(res, 200, await saveUpload(id, await readJsonBody(req)));
          return;
        }
        if (req.method === "POST" && action === "interpret") {
          sendJson(res, 202, await startInterpret(id));
          return;
        }
        throw httpError(404, "没有这个接口");
      }
      if (req.method === "GET") {
        serveStatic(req, res, url);
        return;
      }
      sendJson(res, 404, { error: "没有这个接口" });
    } catch (error) {
      const status = error.status || 500;
      sendJson(res, status, { error: scrub(error.message, cursorKey()) || "请求失败", reason: error.reason || "" });
    }
  }

  function close() {
    if (timer) clearInterval(timer);
  }

  return {
    handle,
    tick,
    close,
    publicPaper,
    dataDir,
  };
}

module.exports = {
  KEY_NAME,
  createService,
  extractPdfText,
  buildInterpretPrompt,
  safeId,
};
