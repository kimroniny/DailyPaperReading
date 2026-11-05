// 正文仍是那 7 个字段的 JSON。
// 网页里如果用 application/json，浏览器会先发一个空的预检，WPS 会把它当成一次没有正文的调用，按钮就会直接失败。
// text/plain 不会触发预检，JSON 还是放在请求体里。
const WPS_SHEETS = [
  {
    id: "security",
    label: "区块链安全防控",
    webhookUrl: "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3LfZ9hJlK36xtwAXso5YrkinA1V",
  },
  {
    id: "mechanism",
    label: "区块链机制设计",
    webhookUrl: "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3LfkQm1zsMlk0kjIiSjbYZNKZOi",
  },
];

const WPS_IMPORT_KEY = "dailypaperreading.wps-imports";

function sheetById(sheetId) {
  return WPS_SHEETS.find((sheet) => sheet.id === sheetId) || null;
}

function importStore(storage) {
  if (storage) return storage;
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function readImportMap(storage) {
  const store = importStore(storage);
  if (!store) return {};
  try {
    const parsed = JSON.parse(store.getItem(WPS_IMPORT_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    return {};
  }
}

function importedSheets(paperId, storage) {
  const map = readImportMap(storage);
  const saved = Array.isArray(map[paperId]) ? map[paperId] : [];
  const ids = new Set(saved);
  return WPS_SHEETS.filter((sheet) => ids.has(sheet.id));
}

function markPaperImported(paperId, sheetId, storage) {
  if (!paperId || !sheetById(sheetId)) return importedSheets(paperId, storage);
  const store = importStore(storage);
  const map = readImportMap(store);
  const ids = importedSheets(paperId, store).map((sheet) => sheet.id);
  if (!ids.includes(sheetId)) ids.push(sheetId);
  map[paperId] = WPS_SHEETS.filter((sheet) => ids.includes(sheet.id)).map((sheet) => sheet.id);
  if (store) store.setItem(WPS_IMPORT_KEY, JSON.stringify(map));
  return importedSheets(paperId, store);
}

function refBib(item) {
  const authors = Array.isArray(item.authors) ? item.authors.filter(Boolean).join(", ") : "";
  const year = item.year ? String(item.year) : "";
  const title = String(item.title || "").trim();
  const venue = String(item.venue || "").trim();
  const bits = [];
  if (authors && year) bits.push(`${authors} (${year}).`);
  else if (authors) bits.push(`${authors}.`);
  else if (year) bits.push(`(${year}).`);
  if (title) bits.push(title.endsWith(".") ? title : `${title}.`);
  if (venue) bits.push(venue.endsWith(".") ? venue : `${venue}.`);
  return bits.join(" ");
}

function publishedDate(item) {
  const added = String(item.addedOn || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(added) ? added : "";
}

function paperToWpsPayload(paper) {
  const item = paper || {};
  return {
    title: item.title || "",
    source: item.venue || "",
    ref_bib: refBib(item),
    url: item.url || "",
    pdf_url: item.pdf || "",
    abstract: item.abstract || item.abstractEn || "",
    published_date: publishedDate(item),
  };
}

async function postPaperToWps(paper, options) {
  const settings = options || {};
  const sheet = sheetById(settings.sheetId);
  if (!sheet) throw new Error("unknown sheet");
  const fetchImpl = settings.fetch || fetch;
  const url = settings.webhookUrl || sheet.webhookUrl;
  const body = JSON.stringify(paperToWpsPayload(paper));
  const retries = settings.retries == null ? 3 : settings.retries;
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body,
      });
      if (response && typeof response.text === "function" && response.type !== "opaque") {
        const text = await response.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (error) {
          data = null;
        }
        if (data && data.code !== 0) {
          const failure = new Error(data.message || "导入失败");
          failure.wps = data;
          throw failure;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      const retryable = !(error instanceof TypeError) && !(error && error.wps);
      if (!retryable || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

const PaperWps = {
  WPS_SHEETS,
  WPS_IMPORT_KEY,
  sheetById,
  importedSheets,
  markPaperImported,
  paperToWpsPayload,
  postPaperToWps,
};

if (typeof module === "object" && module.exports) {
  module.exports = PaperWps;
}

if (typeof window !== "undefined") {
  window.PaperWps = PaperWps;
}
