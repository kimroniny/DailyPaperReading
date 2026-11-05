// kdocs 智能表格的自动化回调不返回跨域响应头。
// application/json 会先发预检，浏览器会拦下真正的 POST。
// text/plain 属于简单请求，JSON 正文仍会被回调收下。
// 三张表共用同一个回调地址，用 sheet 参数区分主题。
const WPS_WEBHOOK_URL =
  "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3CFQc9h2RqjHFUMbY1KKJ73qi2I";

const WPS_SHEETS = [
  { id: "A", label: "A · 链上/协议", webhookUrl: WPS_WEBHOOK_URL, params: { sheet: "A" } },
  { id: "C", label: "C · LLM 安全分析", webhookUrl: WPS_WEBHOOK_URL, params: { sheet: "C" } },
  {
    id: "C-chain",
    label: "C-chain · 合约 + LLM",
    webhookUrl: WPS_WEBHOOK_URL,
    params: { sheet: "C-chain" },
  },
];

function sheetById(sheetId) {
  return WPS_SHEETS.find((sheet) => sheet.id === sheetId) || null;
}

function webhookUrlForSheet(sheet) {
  const params = new URLSearchParams();
  Object.entries((sheet && sheet.params) || {}).forEach(([key, value]) => {
    params.set(key, value == null ? "" : String(value));
  });
  const query = params.toString();
  const base = (sheet && sheet.webhookUrl) || WPS_WEBHOOK_URL;
  if (!query) return base;
  return base + (base.includes("?") ? "&" : "?") + query;
}

function paperToWpsPayload(paper, sheetId) {
  const item = paper || {};
  const year = item.year ? String(item.year) : "";
  const authors = Array.isArray(item.authors) ? item.authors.filter(Boolean).join(", ") : "";
  const topics = Array.isArray(item.topics) ? item.topics.filter(Boolean).join(", ") : "";
  const payload = {
    title: item.title || "",
    url: item.url || "",
    pdf_url: item.pdf || "",
    abstract: item.abstract || item.abstractEn || "",
    published_date: item.addedOn || year,
    authors,
    venue: item.venue || "",
    year,
    topics,
    one_line: item.abstractOneWord || "",
  };
  const sheet = sheetById(sheetId);
  if (sheet) Object.assign(payload, sheet.params);
  return payload;
}

async function postPaperToWps(paper, options) {
  const settings = options || {};
  const sheet = sheetById(settings.sheetId);
  if (!sheet) throw new Error("unknown sheet");
  const fetchImpl = settings.fetch || fetch;
  const response = await fetchImpl(settings.webhookUrl || webhookUrlForSheet(sheet), {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(paperToWpsPayload(paper, sheet.id)),
  });
  return response;
}

const PaperWps = {
  WPS_WEBHOOK_URL,
  WPS_SHEETS,
  sheetById,
  webhookUrlForSheet,
  paperToWpsPayload,
  postPaperToWps,
};

if (typeof module === "object" && module.exports) {
  module.exports = PaperWps;
}

if (typeof window !== "undefined") {
  window.PaperWps = PaperWps;
}
