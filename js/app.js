(function () {
  const { filterPapers, sortPapers, uniqueTopics, uniqueYears } = window.PaperFilter;
  const { mergeDayFiles, groupPapersByDate } = window.PaperCatalog;
  let papers = [];

  const state = {
    query: "",
    topic: "all",
    year: "all",
    sortBy: "date-desc",
  };

  const els = {
    search: document.querySelector("#search"),
    sort: document.querySelector("#sort"),
    year: document.querySelector("#year"),
    topics: document.querySelector("#topics"),
    count: document.querySelector("#count"),
    grid: document.querySelector("#grid"),
    empty: document.querySelector("#empty"),
    clear: document.querySelector("#clear"),
    dialog: document.querySelector("#paper-dialog"),
    dialogBody: document.querySelector("#dialog-body"),
    dialogClose: document.querySelector("#dialog-close"),
  };

  function visiblePapers() {
    return filterPapers(papers, {
      query: state.query,
      topic: state.topic,
      year: state.year,
    });
  }

  function visibleDays() {
    const list = visiblePapers();
    const dateOrder = state.sortBy === "date-asc" ? "asc" : "desc";
    const innerSort =
      state.sortBy === "title" || state.sortBy === "year-desc" || state.sortBy === "year-asc"
        ? state.sortBy
        : null;
    return groupPapersByDate(list, dateOrder)
      .map((day) => ({
        date: day.date,
        papers: innerSort ? sortPapers(day.papers, innerSort) : day.papers,
      }))
      .filter((day) => day.papers.length);
  }

  function formatAddedOn(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
    if (!match) return "未标注日期";
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }

  const TOPIC_LABELS = {
    A: "A · 链上/协议",
    C: "C · LLM 安全分析",
    "C-chain": "C-chain · 合约 + LLM",
  };

  function chip(label, value, selected) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (selected ? " is-active" : "");
    button.dataset.topic = value;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.textContent = TOPIC_LABELS[label] || label;
    return button;
  }

  function renderTopics() {
    els.topics.replaceChildren();
    els.topics.appendChild(chip("全部", "all", state.topic === "all"));
    uniqueTopics(papers).forEach((topic) => {
      els.topics.appendChild(chip(topic, topic, state.topic === topic));
    });
  }

  function renderYears() {
    const current = els.year.value;
    els.year.replaceChildren();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "全部年份";
    els.year.appendChild(all);
    uniqueYears(papers).forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      els.year.appendChild(option);
    });
    els.year.value = current || state.year;
  }

  function card(paper) {
    const article = document.createElement("article");
    article.className = "card";
    article.tabIndex = 0;
    article.dataset.id = paper.id;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", `查看 ${paper.title} 的摘要`);

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = `${paper.venue} · ${paper.year}`;

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = paper.title;

    const authors = document.createElement("p");
    authors.className = "card-authors";
    authors.textContent = (paper.authors || []).join(" · ");

    const excerpt = document.createElement("p");
    excerpt.className = "card-excerpt";
    excerpt.textContent = paper.abstract;

    const tags = document.createElement("ul");
    tags.className = "card-tags";
    (paper.topics || []).forEach((topic) => {
      const li = document.createElement("li");
      li.textContent = topic;
      tags.appendChild(li);
    });

    const more = document.createElement("p");
    more.className = "card-more";
    more.textContent = "阅读摘要";

    article.append(meta, title, authors, excerpt, tags, more);
    return article;
  }

  function daySection(day) {
    const section = document.createElement("section");
    section.className = "day-section";
    section.id = day.date ? `day-${day.date}` : "day-unknown";

    const heading = document.createElement("h2");
    heading.className = "day-heading";
    heading.textContent = `${formatAddedOn(day.date)} · ${day.papers.length} 篇`;

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.append(...day.papers.map(card));

    section.append(heading, grid);
    return section;
  }

  function renderGrid() {
    const days = visibleDays();
    const list = days.flatMap((day) => day.papers);
    const filtering = state.query || state.topic !== "all" || state.year !== "all";
    els.count.textContent = filtering
      ? `显示 ${list.length} / ${papers.length} 篇 · ${days.length} 天`
      : `共 ${papers.length} 篇 · ${days.length} 天`;
    els.clear.hidden = !filtering;
    els.empty.hidden = list.length > 0;
    els.grid.replaceChildren(...days.map(daySection));
  }

  function openPaper(id) {
    const paper = papers.find((item) => item.id === id);
    if (!paper) return;

    const links = [];
    if (paper.url) {
      links.push(`<a href="${paper.url}" target="_blank" rel="noopener noreferrer">原文</a>`);
    }
    if (paper.pdf) {
      links.push(`<a href="${paper.pdf}" target="_blank" rel="noopener noreferrer">PDF</a>`);
    }

    els.dialogBody.innerHTML = `
      <p class="dialog-meta">${paper.venue} · ${paper.year}</p>
      <h2 id="dialog-title">${paper.title}</h2>
      <p class="dialog-authors">${(paper.authors || []).join(" · ")}</p>
      <p class="dialog-abstract">${paper.abstract}</p>
      <ul class="card-tags">${(paper.topics || []).map((topic) => `<li>${topic}</li>`).join("")}</ul>
      <p class="dialog-links">${links.join("<span>·</span>")}</p>
    `;
    els.dialog.showModal();
    els.dialogClose.focus();
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
  }

  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderGrid();
  });

  els.sort.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    renderGrid();
  });

  els.year.addEventListener("change", (event) => {
    state.year = event.target.value;
    renderGrid();
  });

  els.topics.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (!button) return;
    state.topic = button.dataset.topic;
    renderTopics();
    renderGrid();
  });

  els.clear.addEventListener("click", () => {
    state.query = "";
    state.topic = "all";
    state.year = "all";
    els.search.value = "";
    els.year.value = "all";
    renderTopics();
    renderGrid();
  });

  els.grid.addEventListener("click", (event) => {
    const cardEl = event.target.closest(".card");
    if (cardEl) openPaper(cardEl.dataset.id);
  });

  els.grid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const cardEl = event.target.closest(".card");
    if (!cardEl) return;
    event.preventDefault();
    openPaper(cardEl.dataset.id);
  });

  async function loadCatalog() {
    const manifestRes = await fetch("data/manifest.json");
    if (!manifestRes.ok) throw new Error("missing manifest");
    const manifest = await manifestRes.json();
    const days = await Promise.all(
      (manifest.dates || []).map(async (date) => {
        const res = await fetch(`data/${date}.json`);
        if (!res.ok) throw new Error(date);
        return res.json();
      })
    );
    return mergeDayFiles(days);
  }

  els.dialogClose.addEventListener("click", closeDialog);
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) closeDialog();
  });

  els.count.textContent = "加载中…";
  loadCatalog()
    .then((list) => {
      papers = list;
      renderYears();
      renderTopics();
      renderGrid();
    })
    .catch(() => {
      papers = [];
      els.empty.hidden = false;
      els.count.textContent = "共 0 篇";
    });
})();
