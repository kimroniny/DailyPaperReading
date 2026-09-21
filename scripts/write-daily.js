#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { cardFromRadar, upsertManifest } = require("../js/catalog.js");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main(argv) {
  const src = argv[0];
  if (!src) {
    console.error("usage: node scripts/write-daily.js digest.json [--date YYYY-MM-DD]");
    process.exit(1);
  }
  const dateFlag = argv.indexOf("--date");
  const date = dateFlag >= 0 ? argv[dateFlag + 1] : today();
  const raw = readJson(src, []);
  const list = Array.isArray(raw) ? raw : raw.papers || raw.selected || [];
  const papers = list.map(cardFromRadar).filter((paper) => paper.id && paper.title);
  const root = path.join(__dirname, "..");
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dayFile = path.join(dataDir, `${date}.json`);
  fs.writeFileSync(dayFile, JSON.stringify({ date, papers }, null, 2) + "\n");
  const manifestPath = path.join(dataDir, "manifest.json");
  const manifest = upsertManifest(readJson(manifestPath, { dates: [] }), date);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`wrote ${papers.length} papers to data/${date}.json`);
}

main(process.argv.slice(2));
