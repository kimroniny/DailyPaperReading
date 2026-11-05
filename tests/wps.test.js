const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { paperToWpsPayload, postPaperToWps, WPS_WEBHOOK_URL } = require("../js/wps.js");

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

  it("posts JSON as text/plain so the browser can reach kdocs", async () => {
    const calls = [];
    const response = await postPaperToWps(
      { title: "A paper", url: "https://example.test/a", pdf: "https://example.test/a.pdf" },
      {
        fetch: async (url, init) => {
          calls.push({ url, init });
          return { type: "opaque" };
        },
      }
    );

    assert.equal(response.type, "opaque");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, WPS_WEBHOOK_URL);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.mode, "no-cors");
    assert.equal(calls[0].init.headers["Content-Type"], "text/plain;charset=UTF-8");
    assert.deepEqual(JSON.parse(calls[0].init.body), paperToWpsPayload({
      title: "A paper",
      url: "https://example.test/a",
      pdf: "https://example.test/a.pdf",
    }));
  });
});
