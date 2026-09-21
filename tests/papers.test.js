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
});
