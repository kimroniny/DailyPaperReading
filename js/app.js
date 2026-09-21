(function () {
  const { filterPapers, sortPapers, uniqueTopics, uniqueYears } = window.PaperFilter;
  const { mergeDayFiles, groupPapersByDate, pickVisibleDay } = window.PaperCatalog;
  let papers = [];

  const state = {
    query: "",
    topic: "all",
    year: "all",
    sortBy: "date-desc",
    selectedDate: "",
  };

  const els = {
    search: document.querySelector("#search"),
    sort: document.querySelector("#sort"),
    year: document.querySelector("#year"),
    topics: document.querySelector("#topics"),
    dates: document.querySelector("#dates"),
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

  function shortDate(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
    if (!match) return "未标注";
    return `${match[2]}-${match[3]}`;
  }

  function row(paper) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row";
    button.dataset.id = paper.id;

    const copy = document.createElement("span");
    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = paper.title;
    const meta = document.createElement("span");
    meta.className = "row-meta";
    meta.textContent = `${paper.venue} · ${paper.year}`;
    copy.append(title, meta);

    const topic = document.createElement("span");
    topic.className = "row-topic";
    topic.textContent = (paper.topics || [])[0] || "";

    button.append(copy, topic);
    return button;
  }

  function renderDates(days, active) {
    const scrollTop = els.dates.scrollTop;
    els.dates.replaceChildren();
    days.forEach((day) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-link" + (day.date === active ? " is-active" : "");
      button.dataset.date = day.date;
      button.setAttribute("aria-pressed", day.date === active ? "true" : "false");
      const label = document.createElement("span");
      label.textContent = shortDate(day.date);
      const count = document.createElement("span");
      count.textContent = String(day.papers.length);
      button.append(label, count);
      els.dates.appendChild(button);
    });
    els.dates.scrollTop = scrollTop;
  }

  function renderDay(days, day) {
    if (!day) {
      els.grid.replaceChildren();
      return;
    }
    const index = days.findIndex((item) => item.date === day.date);
    const head = document.createElement("div");
    head.className = "day-head";

    const title = document.createElement("h2");
    title.className = "day-title";
    title.textContent = `${formatAddedOn(day.date)} · ${day.papers.length} 篇`;

    const nav = document.createElement("div");
    nav.className = "day-nav";
    const newer = document.createElement("button");
    newer.type = "button";
    newer.dataset.shift = "-1";
    newer.textContent = "更新";
    newer.disabled = index <= 0;
    const older = document.createElement("button");
    older.type = "button";
    older.dataset.shift = "1";
    older.textContent = "更早";
    older.disabled = index < 0 || index >= days.length - 1;
    nav.append(newer, older);
    head.append(title, nav);

    const list = document.createElement("div");
    list.className = "paper-list";
    list.append(...day.papers.map(row));
    els.grid.replaceChildren(head, list);
  }

  function renderGrid() {
    const days = visibleDays();
    const total = days.reduce((sum, day) => sum + day.papers.length, 0);
    const filtering = state.query || state.topic !== "all" || state.year !== "all";
    const day = pickVisibleDay(days, state.selectedDate);
    state.selectedDate = day ? day.date : "";
    els.count.textContent = filtering
      ? `显示 ${total} / ${papers.length} 篇`
      : `共 ${papers.length} 篇`;
    els.clear.hidden = !filtering;
    els.empty.hidden = total > 0;
    els.dates.hidden = total === 0;
    renderDates(days, state.selectedDate);
    renderDay(days, day);
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

  els.dates.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    state.selectedDate = button.dataset.date;
    renderGrid();
  });

  els.grid.addEventListener("click", (event) => {
    const shift = event.target.closest("[data-shift]");
    if (shift) {
      const days = visibleDays();
      const index = days.findIndex((day) => day.date === state.selectedDate);
      const next = days[index + Number(shift.dataset.shift)];
      if (next) state.selectedDate = next.date;
      renderGrid();
      return;
    }
    const rowEl = event.target.closest(".row");
    if (rowEl) openPaper(rowEl.dataset.id);
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
