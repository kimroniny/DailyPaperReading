function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesQuery(paper, query) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    paper.id,
    paper.title,
    paper.venue,
    paper.abstractOneWord,
    paper.abstract,
    paper.abstractEn,
    ...(paper.authors || []),
    ...(paper.aliases || []),
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(q);
}

function filterPapers(papers, { query = "", topic = "all", year = "all", venue = "all" } = {}) {
  return papers.filter((paper) => {
    if (!matchesQuery(paper, query)) return false;
    if (topic && topic !== "all" && !(paper.topics || []).includes(topic)) return false;
    if (year && year !== "all" && String(paper.year) !== String(year)) return false;
    if (venue && venue !== "all" && paper.venue !== venue) return false;
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

function uniqueVenues(papers) {
  const counts = new Map();
  for (const paper of papers || []) {
    const venue = paper.venue || "未标注";
    counts.set(venue, (counts.get(venue) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const PaperFilter = { filterPapers, sortPapers, uniqueTopics, uniqueYears, uniqueVenues };

if (typeof module === "object" && module.exports) {
  module.exports = PaperFilter;
}

if (typeof window !== "undefined") {
  window.PaperFilter = PaperFilter;
}
