const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeDayFiles,
  upsertManifest,
  cardFromRadar,
  onlyDataPaths,
} = require("../js/catalog.js");

describe("mergeDayFiles", () => {
  it("keeps the newest day's copy when ids collide", () => {
    const papers = mergeDayFiles([
      {
        date: "2026-09-21",
        papers: [{ id: "a", title: "new", topics: ["C"] }],
      },
      {
        date: "2026-09-20",
        papers: [
          { id: "a", title: "old", topics: ["C"] },
          { id: "b", title: "other", topics: ["A"] },
        ],
      },
    ]);
    assert.deepEqual(
      papers.map((p) => p.id + ":" + p.title),
      ["a:new", "b:other"]
    );
  });
});

describe("upsertManifest", () => {
  it("puts the new date first and drops duplicates", () => {
    assert.deepEqual(upsertManifest({ dates: ["2026-09-20", "2026-09-19"] }, "2026-09-21"), {
      dates: ["2026-09-21", "2026-09-20", "2026-09-19"],
    });
    assert.deepEqual(upsertManifest({ dates: ["2026-09-21", "2026-09-20"] }, "2026-09-21"), {
      dates: ["2026-09-21", "2026-09-20"],
    });
  });
});

describe("cardFromRadar", () => {
  it("maps radar JSON onto a card paper", () => {
    const card = cardFromRadar({
      paper_id: "2026/1877",
      title: "Otter",
      authors: ["Elaine Shi"],
      venue: "ePrint",
      published: "2026-09-03",
      summary: "MEV AMM",
      category: "A",
      url: "https://eprint.iacr.org/2026/1877",
    });
    assert.equal(card.id, "2026-1877");
    assert.equal(card.year, 2026);
    assert.deepEqual(card.topics, ["A"]);
    assert.equal(card.abstract, "MEV AMM");
  });
});

describe("onlyDataPaths", () => {
  it("allows daily JSON plus the manifest", () => {
    assert.equal(onlyDataPaths(["data/manifest.json", "data/2026-09-21.json"]), true);
    assert.equal(onlyDataPaths(["data/2026-09-21.json", "js/app.js"]), false);
    assert.equal(onlyDataPaths([]), false);
  });
});
