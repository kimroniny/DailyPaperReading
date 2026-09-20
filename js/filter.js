function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesQuery(paper, query) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    paper.title,
    paper.venue,
    paper.abstract,
    ...(paper.authors || []),
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(q);
}

function filterPapers(papers, { query = "", topic = "all", year = "all" } = {}) {
  return papers.filter((paper) => {
    if (!matchesQuery(paper, query)) return false;
    if (topic && topic !== "all" && !(paper.topics || []).includes(topic)) return false;
    if (year && year !== "all" && String(paper.year) !== String(year)) return false;
    return true;
  });
}

function sortPapers(papers, sortBy = "year-desc") {
  const copy = papers.slice();
  copy.sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    const yearDiff = sortBy === "year-asc" ? a.year - b.year : b.year - a.year;
    if (yearDiff !== 0) return yearDiff;
    return a.title.localeCompare(b.title);
  });
  return copy;
}

function uniqueTopics(papers) {
  return [...new Set(papers.flatMap((paper) => paper.topics || []))].sort((a, b) => {
    const aLatin = /^[\x00-\x7F]/.test(a);
    const bLatin = /^[\x00-\x7F]/.test(b);
    if (aLatin !== bLatin) return aLatin ? -1 : 1;
    return a.localeCompare(b, "en");
  });
}

function uniqueYears(papers) {
  return [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a);
}

const PaperFilter = { filterPapers, sortPapers, uniqueTopics, uniqueYears };

if (typeof module === "object" && module.exports) {
  module.exports = PaperFilter;
}

if (typeof window !== "undefined") {
  window.PaperFilter = PaperFilter;
}
