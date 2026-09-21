const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  filterPapers,
  sortPapers,
  uniqueTopics,
  uniqueYears,
  uniqueVenues,
} = require("../js/filter.js");

const papers = [
  {
    id: "a",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer"],
    year: 2017,
    venue: "NeurIPS",
    abstract: "提出 Transformer，用自注意力取代循环结构。",
    topics: ["NLP", "架构"],
  },
  {
    id: "b",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He"],
    year: 2016,
    venue: "CVPR",
    abstract: "残差连接让深层卷积网络更易训练。",
    topics: ["CV", "架构"],
  },
  {
    id: "c",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: ["Jacob Devlin"],
    year: 2019,
    venue: "NAACL",
    abstract: "双向掩码语言模型预训练。",
    topics: ["NLP"],
  },
];

describe("filterPapers", () => {
  it("returns all papers when query and filters are empty", () => {
    assert.equal(filterPapers(papers, { query: "", topic: "all", year: "all" }).length, 3);
  });

  it("matches title, author, abstract, or venue case-insensitively", () => {
    assert.deepEqual(
      filterPapers(papers, { query: "vaswani", topic: "all", year: "all" }).map((p) => p.id),
      ["a"]
    );
    assert.deepEqual(
      filterPapers(papers, { query: "残差", topic: "all", year: "all" }).map((p) => p.id),
      ["b"]
    );
    assert.deepEqual(
      filterPapers(papers, { query: "naacl", topic: "all", year: "all" }).map((p) => p.id),
      ["c"]
    );
  });

  it("filters by topic and year together", () => {
    assert.deepEqual(
      filterPapers(papers, { query: "", topic: "NLP", year: "2017" }).map((p) => p.id),
      ["a"]
    );
    assert.deepEqual(
      filterPapers(papers, { query: "transformer", topic: "CV", year: "all" }).map((p) => p.id),
      []
    );
  });

  it("filters by venue", () => {
    assert.deepEqual(
      filterPapers(papers, { query: "", topic: "all", year: "all", venue: "CVPR" }).map((p) => p.id),
      ["b"]
    );
  });

  it("matches paper id and aliases", () => {
    const withAlias = [
      {
        id: "resnet",
        title: "Deep Residual Learning for Image Recognition",
        authors: ["Kaiming He"],
        year: 2016,
        venue: "CVPR",
        abstract: "残差连接让深层卷积网络更易训练。",
        topics: ["CV"],
        aliases: ["ResNet"],
      },
    ];
    assert.deepEqual(
      filterPapers(withAlias, { query: "resnet", topic: "all", year: "all" }).map((p) => p.id),
      ["resnet"]
    );
  });
});

describe("sortPapers", () => {
  it("sorts by year descending then title", () => {
    const ids = sortPapers(papers, "year-desc").map((p) => p.id);
    assert.deepEqual(ids, ["c", "a", "b"]);
  });

  it("sorts by year ascending then title", () => {
    const ids = sortPapers(papers, "year-asc").map((p) => p.id);
    assert.deepEqual(ids, ["b", "a", "c"]);
  });

  it("sorts by title", () => {
    const ids = sortPapers(papers, "title").map((p) => p.id);
    assert.deepEqual(ids, ["a", "c", "b"]);
  });
});

describe("uniqueTopics and uniqueYears", () => {
  it("returns sorted unique topics and years", () => {
    assert.deepEqual(uniqueTopics(papers), ["CV", "NLP", "架构"]);
    assert.deepEqual(uniqueYears(papers), [2019, 2017, 2016]);
  });

  it("lists venues by frequency", () => {
    assert.deepEqual(uniqueVenues(papers), [
      ["CVPR", 1],
      ["NAACL", 1],
      ["NeurIPS", 1],
    ]);
  });
});
