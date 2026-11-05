// kdocs 智能表格的自动化回调不返回跨域响应头。
// application/json 会先发预检，浏览器会拦下真正的 POST。
// text/plain 属于简单请求，JSON 正文仍会被回调收下。
const WPS_WEBHOOK_URL =
  "https://www.kdocs.cn/chatflow/api/v2/func/webhook/3CFQc9h2RqjHFUMbY1KKJ73qi2I";

function paperToWpsPayload(paper) {
  const item = paper || {};
  const year = item.year ? String(item.year) : "";
  const authors = Array.isArray(item.authors) ? item.authors.filter(Boolean).join(", ") : "";
  const topics = Array.isArray(item.topics) ? item.topics.filter(Boolean).join(", ") : "";
  return {
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
}

async function postPaperToWps(paper, options) {
  const settings = options || {};
  const fetchImpl = settings.fetch || fetch;
  const response = await fetchImpl(settings.webhookUrl || WPS_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(paperToWpsPayload(paper)),
  });
  return response;
}

const PaperWps = { WPS_WEBHOOK_URL, paperToWpsPayload, postPaperToWps };

if (typeof module === "object" && module.exports) {
  module.exports = PaperWps;
}

if (typeof window !== "undefined") {
  window.PaperWps = PaperWps;
}
