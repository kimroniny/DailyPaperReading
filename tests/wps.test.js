const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { paperToWpsPayload, postPaperToWps, WPS_SHEETS } = require("../js/wps.js");

describe("WPS webhook payload", () => {
  it("maps a reading card onto the sheet fields used by ArxivDailyBlockchain", () => {
    const payload = paperToWpsPayload({
      id: "2611.04196",
      title: "DoGNAVY-Exploit",
      authors: ["Yuxuan Wang", "Dadi Guo"],
      year: 2026,
      venue: "arXiv",
      abstract: "中文摘要",
      abstractEn: "English abstract",
      abstractOneWord: "一句话",
      topics: ["C", ""],
      url: "https://arxiv.org/abs/2611.04196",
      pdf: "https://arxiv.org/pdf/2611.04196",
      addedOn: "2026-11-04",
    });

    assert.deepEqual(payload, {
      title: "DoGNAVY-Exploit",
      url: "https://arxiv.org/abs/2611.04196",
      pdf_url: "https://arxiv.org/pdf/2611.04196",
      abstract: "中文摘要",
      published_date: "2026-11-04",
      authors: "Yuxuan Wang, Dadi Guo",
      venue: "arXiv",
      year: "2026",
      topics: "C",
      one_line: "一句话",
    });
  });

  it("falls back to the English abstract and the year when the card is sparse", () => {
    const payload = paperToWpsPayload({
      title: "Only English",
      abstractEn: "English abstract",
      year: 2024,
    });
    assert.equal(payload.abstract, "English abstract");
    assert.equal(payload.published_date, "2024");
    assert.equal(payload.pdf_url, "");
    assert.equal(payload.authors, "");
  });

  it("lists the two named sheets and keeps the paper fields free of a sheet flag", () => {
    assert.deepEqual(
      WPS_SHEETS.map((sheet) => [sheet.id, sheet.label]),
      [
        ["security", "区块链安全防控"],
        ["mechanism", "区块链机制设计"],
      ]
    );
    assert.equal(
      WPS_SHEETS[0].webhookUrl,
      "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3LfZ9hJlK36xtwAXso5YrkinA1V"
    );
    assert.equal(
      WPS_SHEETS[1].webhookUrl,
      "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3LfkQm1zsMlk0kjIiSjbYZNKZOi"
    );
    assert.equal(paperToWpsPayload({ title: "DoGNAVY-Exploit", topics: ["C"] }).sheet, undefined);
  });

  it("posts JSON as text/plain to the chosen sheet", async () => {
    const calls = [];
    const paper = { title: "A paper", url: "https://example.test/a", pdf: "https://example.test/a.pdf" };
    const response = await postPaperToWps(paper, {
      sheetId: "mechanism",
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { type: "opaque" };
      },
    });

    assert.equal(response.type, "opaque");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, WPS_SHEETS.find((sheet) => sheet.id === "mechanism").webhookUrl);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.mode, "no-cors");
    assert.equal(calls[0].init.headers["Content-Type"], "text/plain;charset=UTF-8");
    assert.equal(JSON.parse(calls[0].init.body).title, "A paper");
    assert.equal(JSON.parse(calls[0].init.body).sheet, undefined);
    await assert.rejects(() => postPaperToWps(paper, { fetch: async () => ({}) }), /unknown sheet/);
  });
});
