// 和 ArxivDailyBlockchain 的 webhook_utils 一样：POST，正文是 JSON，Content-Type 为 application/json。
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

function sheetById(sheetId) {
  return WPS_SHEETS.find((sheet) => sheet.id === sheetId) || null;
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
        headers: { "Content-Type": "application/json" },
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

const PaperWps = { WPS_SHEETS, sheetById, paperToWpsPayload, postPaperToWps };

if (typeof module === "object" && module.exports) {
  module.exports = PaperWps;
}

if (typeof window !== "undefined") {
  window.PaperWps = PaperWps;
}
