const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { mergeDayFiles } = require("../js/catalog.js");

const ALLOWED = new Set(["A", "C", "C-chain"]);
const PLACEHOLDERS = [
  "Attention Is All You Need",
  "Deep Residual Learning for Image Recognition",
  "Highly Accurate Protein Structure Prediction with AlphaFold",
  "BERT: Pre-training of Deep Bidirectional Transformers",
];

function loadPapers() {
  const root = path.join(__dirname, "..", "data");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const days = (manifest.dates || []).map((date) =>
    JSON.parse(fs.readFileSync(path.join(root, `${date}.json`), "utf8"))
  );
  return mergeDayFiles(days);
}

describe("daily JSON catalog", () => {
  it("only includes A / C / C-chain security papers", () => {
    const papers = loadPapers();
    assert.ok(papers.length >= 8);
    const cats = new Set();
    for (const paper of papers) {
      const topics = paper.topics || [];
      assert.ok(
        topics.some((topic) => ALLOWED.has(topic)),
        `${paper.title} missing A/C/C-chain topic`
      );
      topics.filter((topic) => ALLOWED.has(topic)).forEach((topic) => cats.add(topic));
    }
    assert.deepEqual([...cats].sort(), ["A", "C", "C-chain"]);
  });

  it("does not keep the ML placeholder titles", () => {
    const titles = new Set(loadPapers().map((paper) => paper.title));
    for (const title of PLACEHOLDERS) {
      assert.equal(titles.has(title), false, title);
    }
  });

  it("keeps the original gallery seed papers after a same-day radar overwrite", () => {
    const ids = new Set(loadPapers().map((paper) => paper.id));
    const seed = [
      "2609.10780",
      "2605.21779",
      "2607.08949",
      "2608.06641",
      "tse-2025-numscout",
      "2603.26270",
      "2602.03271",
      "2512.06846",
      "2026-1877",
      "2026-1827",
      "2026-1760",
      "ndss-2026-bunnyfinder",
    ];
    const radar = [
      "2609.21020",
      "10.1145-3846194",
      "10.1145-3796526",
      "10.1145-3845985",
      "2609.21344",
      "2609.20752",
      "2609.21627",
      "2609.18563",
    ];
    for (const id of [...seed, ...radar]) {
      assert.ok(ids.has(id), `missing ${id}`);
    }
    assert.ok(loadPapers().length >= seed.length + radar.length);
  });

  it("imports historical radar memory days into the catalog", () => {
    const root = path.join(__dirname, "..", "data");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    assert.ok(manifest.dates.includes("2026-08-24"));
    assert.ok(manifest.dates.includes("2026-09-19"));
    const ids = new Set(loadPapers().map((paper) => paper.id));
    for (const id of ["2608.20637", "2026-1757", "2609.17817", "10.1145-3848030"]) {
      assert.ok(ids.has(id), `missing memory paper ${id}`);
    }
    assert.ok(loadPapers().length >= 250);
  });

  it("gives every paper a one-line summary, a Chinese abstract, and an English abstract", () => {
    const han = /[\u4e00-\u9fff]/;
    const latinRun = /[A-Za-z][A-Za-z ,;\-]{180,}/;
    for (const paper of loadPapers()) {
      const one = paper.abstractOneWord || "";
      const chinese = paper.abstract || "";
      const english = paper.abstractEn || "";
      assert.ok(han.test(one), `${paper.id} missing 一句话摘要`);
      assert.ok(han.test(chinese), `${paper.id} missing 中文摘要`);
      assert.ok(/[A-Za-z]/.test(english) && english.length > 40, `${paper.id} missing 英文原文摘要`);
      assert.equal(latinRun.test(chinese), false, `${paper.id} 中文摘要里仍粘着英文原文`);
    }
  });
});
