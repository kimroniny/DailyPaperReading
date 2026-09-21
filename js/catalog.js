function mergeDayFiles(days) {
  const seen = new Set();
  const papers = [];
  for (const day of days || []) {
    for (const paper of day.papers || []) {
      if (!paper || !paper.id || seen.has(paper.id)) continue;
      seen.add(paper.id);
      papers.push(paper);
    }
  }
  return papers;
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
  return {
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
}

function onlyDataPaths(paths) {
  if (!paths || !paths.length) return false;
  return paths.every((path) => /^data\/(manifest\.json|\d{4}-\d{2}-\d{2}\.json)$/.test(path));
}

const PaperCatalog = { mergeDayFiles, upsertManifest, cardFromRadar, onlyDataPaths };

if (typeof module === "object" && module.exports) {
  module.exports = PaperCatalog;
}

if (typeof window !== "undefined") {
  window.PaperCatalog = PaperCatalog;
}
