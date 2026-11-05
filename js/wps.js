// kdocs 智能表格的自动化回调不返回跨域响应头。
// application/json 会先发预检，浏览器会拦下真正的 POST。
// text/plain 属于简单请求，JSON 正文仍会被回调收下。
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
    "ref-bib": refBib(item),
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
  const response = await fetchImpl(settings.webhookUrl || sheet.webhookUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(paperToWpsPayload(paper)),
  });
  return response;
}

const PaperWps = { WPS_SHEETS, sheetById, paperToWpsPayload, postPaperToWps };

if (typeof module === "object" && module.exports) {
  module.exports = PaperWps;
}

if (typeof window !== "undefined") {
  window.PaperWps = PaperWps;
}
