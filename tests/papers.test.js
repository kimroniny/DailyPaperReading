const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { PAPERS } = require("../js/papers.js");

const ALLOWED = new Set(["A", "C", "C-chain"]);
const PLACEHOLDERS = [
  "Attention Is All You Need",
  "Deep Residual Learning for Image Recognition",
  "Highly Accurate Protein Structure Prediction with AlphaFold",
  "BERT: Pre-training of Deep Bidirectional Transformers",
];

describe("PAPERS catalog", () => {
  it("only includes A / C / C-chain security papers", () => {
    assert.ok(PAPERS.length >= 8);
    const cats = new Set();
    for (const paper of PAPERS) {
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
    const titles = new Set(PAPERS.map((paper) => paper.title));
    for (const title of PLACEHOLDERS) {
      assert.equal(titles.has(title), false, title);
    }
  });
});
