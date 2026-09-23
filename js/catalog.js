function mergeDayFiles(days) {
  const seen = new Set();
  const papers = [];
  for (const day of days || []) {
    for (const paper of day.papers || []) {
      if (!paper || !paper.id || seen.has(paper.id)) continue;
      seen.add(paper.id);
      papers.push({ ...paper, addedOn: day.date || paper.addedOn });
    }
  }
  return papers;
}

function mergeSameDayPapers(incoming, existing) {
  return mergeDayFiles([{ papers: incoming }, { papers: existing }]);
}

function groupPapersByDate(papers, direction = "desc") {
  const buckets = new Map();
  for (const paper of papers || []) {
    const date = paper.addedOn || "";
    if (!buckets.has(date)) buckets.set(date, []);
    buckets.get(date).push(paper);
  }
  const dates = [...buckets.keys()].sort((a, b) =>
    direction === "asc" ? a.localeCompare(b) : b.localeCompare(a)
  );
  return dates.map((date) => ({ date, papers: buckets.get(date) }));
}

function groupDaysByMonth(days) {
  const months = [];
  for (const day of days || []) {
    const month = String(day.date || "").slice(0, 7);
    const last = months[months.length - 1];
    if (!last || last.month !== month) months.push({ month, days: [day] });
    else last.days.push(day);
  }
  return months;
}

function pickVisibleDay(days, selectedDate) {
  if (!days || !days.length) return null;
  return days.find((day) => day.date === selectedDate) || days[0];
}

function upsertManifest(manifest, date) {
  const dates = [date, ...((manifest && manifest.dates) || []).filter((item) => item !== date)];
  return { dates };
}

function cardFromRadar(raw) {
  const paper = raw || {};
  const rawId = String(paper.paper_id || paper.id || "");
  const published = paper.published ? String(paper.published) : "";
  const year =
    paper.year ||
    (published.length >= 4 ? Number.parseInt(published.slice(0, 4), 10) : undefined);
  const topics = paper.topics && paper.topics.length ? paper.topics : paper.category ? [paper.category] : [];
  const card = {
    id: rawId.replace(/\//g, "-"),
    title: paper.title || "",
    authors: paper.authors || [],
    year: year || undefined,
    venue: paper.venue || paper.source || "arXiv",
    abstract: paper.abstract || paper.summary || "",
    topics,
    aliases: paper.aliases || paper.tags || [],
    url: paper.url,
    pdf: paper.pdf,
  };
  if (paper.abstractEn) card.abstractEn = paper.abstractEn;
  if (paper.abstractOneWord) card.abstractOneWord = paper.abstractOneWord;
  return card;
}

function onlyDataPaths(paths) {
  if (!paths || !paths.length) return false;
  return paths.every((path) => /^data\/(manifest\.json|\d{4}-\d{2}-\d{2}\.json)$/.test(path));
}

const PaperCatalog = {
  mergeDayFiles,
  mergeSameDayPapers,
  groupPapersByDate,
  groupDaysByMonth,
  pickVisibleDay,
  upsertManifest,
  cardFromRadar,
  onlyDataPaths,
};

if (typeof module === "object" && module.exports) {
  module.exports = PaperCatalog;
}

if (typeof window !== "undefined") {
  window.PaperCatalog = PaperCatalog;
}
