const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeDayFiles,
  mergeSameDayPapers,
  groupPapersByDate,
  groupDaysByMonth,
  pickVisibleDay,
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
    assert.equal(papers[0].addedOn, "2026-09-21");
    assert.equal(papers[1].addedOn, "2026-09-20");
  });
});

describe("groupPapersByDate", () => {
  it("groups papers under addedOn dates, newest first", () => {
    const groups = groupPapersByDate([
      { id: "b", addedOn: "2026-09-20" },
      { id: "a", addedOn: "2026-09-21" },
      { id: "c", addedOn: "2026-09-20" },
    ]);
    assert.deepEqual(
      groups.map((g) => g.date + ":" + g.papers.map((p) => p.id).join(",")),
      ["2026-09-21:a", "2026-09-20:b,c"]
    );
  });

  it("can sort days oldest first", () => {
    const groups = groupPapersByDate(
      [
        { id: "a", addedOn: "2026-09-21" },
        { id: "b", addedOn: "2026-09-20" },
      ],
      "asc"
    );
    assert.deepEqual(
      groups.map((g) => g.date),
      ["2026-09-20", "2026-09-21"]
    );
  });
});

describe("groupDaysByMonth", () => {
  it("folds consecutive days into months", () => {
    const months = groupDaysByMonth([
      { date: "2026-09-21" },
      { date: "2026-09-20" },
      { date: "2026-08-31" },
    ]);
    assert.deepEqual(
      months.map((month) => month.month + ":" + month.days.length),
      ["2026-09:2", "2026-08:1"]
    );
  });
});

describe("pickVisibleDay", () => {
  const days = [
    { date: "2026-09-21", papers: [{ id: "a" }] },
    { date: "2026-09-20", papers: [{ id: "b" }] },
  ];

  it("keeps the selected day when it still has papers", () => {
    assert.equal(pickVisibleDay(days, "2026-09-20").date, "2026-09-20");
  });

  it("falls back to the first listed day", () => {
    assert.equal(pickVisibleDay(days, "2026-08-01").date, "2026-09-21");
    assert.equal(pickVisibleDay([], "2026-09-21"), null);
  });
});

describe("mergeSameDayPapers", () => {
  it("keeps papers already in the day file when a later write lists new ids", () => {
    const papers = mergeSameDayPapers(
      [{ id: "new", title: "today" }],
      [{ id: "seed", title: "history" }, { id: "new", title: "older copy" }]
    );
    assert.deepEqual(
      papers.map((p) => p.id + ":" + p.title),
      ["new:today", "seed:history"]
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
