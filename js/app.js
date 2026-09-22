(function () {
  const { filterPapers, sortPapers, uniqueTopics, uniqueYears, uniqueVenues } = window.PaperFilter;
  const { mergeDayFiles, groupPapersByDate, groupDaysByMonth, pickVisibleDay } = window.PaperCatalog;
  let papers = [];

  const state = {
    query: "",
    topic: "all",
    year: "all",
    venue: "all",
    sortBy: "date-desc",
    selectedDate: "",
  };

  const els = {
    search: document.querySelector("#search"),
    sort: document.querySelector("#sort"),
    year: document.querySelector("#year"),
    venue: document.querySelector("#venue"),
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
      venue: state.venue,
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

  function formatMonth(month) {
    const match = /^(\d{4})-(\d{2})$/.exec(month || "");
    if (!match) return "未标注";
    return `${match[1]}年${Number(match[2])}月`;
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

  function renderVenues() {
    const current = state.venue;
    els.venue.replaceChildren();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "全部会议/期刊";
    els.venue.appendChild(all);
    uniqueVenues(papers).forEach(([venue, count]) => {
      const option = document.createElement("option");
      option.value = venue;
      option.textContent = `${venue} · ${count}`;
      els.venue.appendChild(option);
    });
    els.venue.value = current || "all";
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
    const activeMonth = String(active || "").slice(0, 7);
    const months = groupDaysByMonth(days);
    els.dates.replaceChildren();
    months.forEach((month) => {
      const count = month.days.reduce((sum, day) => sum + day.papers.length, 0);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-link" + (month.month === activeMonth ? " is-active" : "");
      button.dataset.month = month.month;
      button.setAttribute("aria-pressed", month.month === activeMonth ? "true" : "false");
      const label = document.createElement("span");
      label.textContent = formatMonth(month.month);
      const total = document.createElement("span");
      total.textContent = String(count);
      button.append(label, total);
      els.dates.appendChild(button);
    });
  }

  function dayStrip(days, active) {
    const month = String(active || "").slice(0, 7);
    const strip = document.createElement("div");
    strip.className = "day-strip";
    days
      .filter((day) => String(day.date).slice(0, 7) === month)
      .forEach((day) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "day-chip" + (day.date === active ? " is-active" : "");
        button.dataset.date = day.date;
        button.textContent = `${shortDate(day.date)} · ${day.papers.length}`;
        strip.appendChild(button);
      });
    return strip;
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
    els.grid.replaceChildren(head, dayStrip(days, day.date), list);
  }

  function renderGrid() {
    const days = visibleDays();
    const total = days.reduce((sum, day) => sum + day.papers.length, 0);
    const filtering = state.query || state.topic !== "all" || state.year !== "all" || state.venue !== "all";
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

    const meta = document.createElement("p");
    meta.className = "dialog-meta";
    meta.textContent = `${paper.venue} · ${paper.year}`;

    const title = document.createElement("h2");
    title.id = "dialog-title";
    title.textContent = paper.title;

    const authors = document.createElement("p");
    authors.className = "dialog-authors";
    authors.textContent = (paper.authors || []).join(" · ");

    const label = document.createElement("p");
    label.className = "abstract-label";
    const body = document.createElement("p");
    body.className = "dialog-abstract";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ghost abstract-toggle";

    const english = paper.abstractEn || "";
    const chinese = paper.abstract || "";
    let showChinese = !english;
    function paintAbstract() {
      const useChinese = showChinese || !english;
      body.textContent = useChinese ? chinese : english;
      label.textContent = useChinese ? "中文摘要" : "原文摘要";
      toggle.hidden = !english || !chinese;
      toggle.textContent = useChinese ? "显示原文" : "显示中文";
    }
    toggle.addEventListener("click", () => {
      showChinese = !showChinese;
      paintAbstract();
    });
    paintAbstract();

    const tags = document.createElement("ul");
    tags.className = "card-tags";
    (paper.topics || []).forEach((topic) => {
      const li = document.createElement("li");
      li.textContent = topic;
      tags.appendChild(li);
    });

    const links = document.createElement("p");
    links.className = "dialog-links";
    [paper.url && ["原文", paper.url], paper.pdf && ["PDF", paper.pdf]].filter(Boolean).forEach(([text, href], index) => {
      if (index) links.appendChild(document.createTextNode(" · "));
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = text;
      links.appendChild(anchor);
    });

    els.dialogBody.replaceChildren(meta, title, authors, label, body, toggle, tags, links);
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

  els.venue.addEventListener("change", (event) => {
    state.venue = event.target.value;
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
    state.venue = "all";
    els.search.value = "";
    els.year.value = "all";
    els.venue.value = "all";
    renderTopics();
    renderGrid();
  });

  els.dates.addEventListener("click", (event) => {
    const monthButton = event.target.closest("[data-month]");
    if (!monthButton) return;
    const month = monthButton.dataset.month;
    const days = visibleDays().filter((day) => String(day.date).slice(0, 7) === month);
    if (days[0]) state.selectedDate = days[0].date;
    renderGrid();
  });

  els.grid.addEventListener("click", (event) => {
    const dateButton = event.target.closest("[data-date]");
    if (dateButton) {
      state.selectedDate = dateButton.dataset.date;
      renderGrid();
      return;
    }
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

  function showPapers(list) {
    papers = list;
    renderYears();
    renderVenues();
    renderTopics();
    renderGrid();
  }

  async function fetchDay(date) {
    const res = await fetch(`data/${date}.json`);
    if (!res.ok) throw new Error(date);
    return res.json();
  }

  async function loadCatalog() {
    const manifestRes = await fetch("data/manifest.json");
    if (!manifestRes.ok) throw new Error("missing manifest");
    const manifest = await manifestRes.json();
    const dates = manifest.dates || [];
    if (!dates.length) return { first: [], rest: Promise.resolve([]) };

    const newest = await fetchDay(dates[0]);
    const rest = Promise.all(dates.slice(1).map((date) => fetchDay(date))).then((days) =>
      mergeDayFiles([newest, ...days])
    );
    return { first: mergeDayFiles([newest]), rest };
  }

  els.dialogClose.addEventListener("click", closeDialog);
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) closeDialog();
  });

  els.count.textContent = "加载中…";
  loadCatalog()
    .then(({ first, rest }) => {
      showPapers(first);
      return rest;
    })
    .then((list) => {
      showPapers(list);
    })
    .catch(() => {
      if (papers.length) return;
      papers = [];
      els.empty.hidden = false;
      els.count.textContent = "共 0 篇";
    });
})();
