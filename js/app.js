(function () {
  const { filterPapers, sortPapers, uniqueTopics, uniqueYears } = window.PaperFilter;
  const papers = window.PAPERS;

  const state = {
    query: "",
    topic: "all",
    year: "all",
    sortBy: "year-desc",
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
    return sortPapers(
      filterPapers(papers, {
        query: state.query,
        topic: state.topic,
        year: state.year,
      }),
      state.sortBy
    );
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
    authors.textContent = paper.authors.join(" · ");

    const excerpt = document.createElement("p");
    excerpt.className = "card-excerpt";
    excerpt.textContent = paper.abstract;

    const tags = document.createElement("ul");
    tags.className = "card-tags";
    paper.topics.forEach((topic) => {
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

  function renderGrid() {
    const list = visiblePapers();
    const filtering = state.query || state.topic !== "all" || state.year !== "all";
    els.count.textContent = filtering
      ? `显示 ${list.length} / ${papers.length} 篇`
      : `共 ${papers.length} 篇`;
    els.clear.hidden = !filtering;
    els.empty.hidden = list.length > 0;
    els.grid.replaceChildren(...list.map(card));
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
      <p class="dialog-authors">${paper.authors.join(" · ")}</p>
      <p class="dialog-abstract">${paper.abstract}</p>
      <ul class="card-tags">${paper.topics.map((topic) => `<li>${topic}</li>`).join("")}</ul>
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

  els.dialogClose.addEventListener("click", closeDialog);
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) closeDialog();
  });

  renderYears();
  renderTopics();
  renderGrid();
})();
