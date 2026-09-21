"""Crossref works search with exact-container matching and zero-add stop."""

from __future__ import annotations

import re
import time
from typing import Any, Iterator
from urllib.parse import urlencode

from paper_radar.config import CCS_CONTAINER, JOURNAL_ISSN
from paper_radar.httputil import fetch_json
from paper_radar.models import Paper

API = "https://api.crossref.org/works"
SELECT = "DOI,title,URL,type,container-title,issued,abstract,author"


def _title_of(item: dict[str, Any]) -> str:
    titles = item.get("title") or []
    if isinstance(titles, list):
        raw = " ".join(str(t) for t in titles).strip()
    else:
        raw = str(titles).strip()
    return _strip_jats(raw)


def _container_of(item: dict[str, Any]) -> str:
    containers = item.get("container-title") or []
    if isinstance(containers, list):
        return " ".join(str(t) for t in containers).strip()
    return str(containers).strip()


def _issued(item: dict[str, Any]) -> str | None:
    parts = ((item.get("issued") or {}).get("date-parts") or [[]])[0]
    if not parts:
        return None
    y = parts[0]
    m = parts[1] if len(parts) > 1 else 1
    d = parts[2] if len(parts) > 2 else 1
    return f"{y:04d}-{m:02d}-{d:02d}"


def _strip_jats(text: str) -> str:
    text = re.sub(r"</?jats:[^>]+>", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def item_to_paper(item: dict[str, Any], *, source: str, venue: str) -> Paper:
    doi = str(item.get("DOI") or "").strip()
    abstract = _strip_jats(str(item.get("abstract") or ""))
    return Paper(
        paper_id=doi or _title_of(item),
        title=_title_of(item),
        url=str(item.get("URL") or (f"https://doi.org/{doi}" if doi else "")),
        source=source,
        venue=venue,
        published=_issued(item),
        summary=abstract,
        top_venue=True,
    )


def _norm_container(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower()).strip()


def iterate_works(params: dict[str, str], *, rows: int = 200) -> Iterator[dict[str, Any]]:
    cursor = "*"
    while True:
        q = dict(params)
        q["rows"] = str(rows)
        q["cursor"] = cursor
        q.setdefault("select", SELECT)
        data = fetch_json(f"{API}?{urlencode(q)}", timeout=90)
        message = data.get("message") or {}
        items = message.get("items") or []
        next_cursor = message.get("next-cursor")
        for item in items:
            yield item
        if not items or not next_cursor or next_cursor == cursor:
            break
        cursor = next_cursor


def _container_ok(
    container_name: str,
    want: str,
    *,
    exact: bool,
    required_substrings: tuple[str, ...] = (),
) -> bool:
    got = _norm_container(container_name)
    if required_substrings:
        return all(_norm_container(s) in got for s in required_substrings)
    if exact:
        return want in got
    return True


def fetch_container(
    container: str,
    *,
    source: str,
    venue: str,
    year: int | None = None,
    extra_filter: str = "",
    exact: bool = True,
    required_substrings: tuple[str, ...] = (),
) -> list[Paper]:
    """Stop when a page adds 0 *matching* items (Crossref otherwise paginates forever)."""
    params: dict[str, str] = {"query.container-title": container}
    filters: list[str] = []
    if year is not None:
        filters.append(f"from-pub-date:{year}-01-01")
        filters.append(f"until-pub-date:{year}-12-31")
    if extra_filter:
        filters.append(extra_filter)
    if filters:
        params["filter"] = ",".join(filters)

    want = _norm_container(container)
    papers: list[Paper] = []
    seen: set[str] = set()

    cursor = "*"
    while True:
        q = dict(params)
        q["rows"] = "200"
        q["cursor"] = cursor
        q.setdefault("select", SELECT)
        data = fetch_json(f"{API}?{urlencode(q)}", timeout=90)
        message = data.get("message") or {}
        items = message.get("items") or []
        next_cursor = message.get("next-cursor")
        added = 0
        for item in items:
            if not _container_ok(
                _container_of(item),
                want,
                exact=exact,
                required_substrings=required_substrings,
            ):
                continue
            paper = item_to_paper(item, source=source, venue=venue)
            if not paper.paper_id or paper.paper_id in seen:
                continue
            seen.add(paper.paper_id)
            papers.append(paper)
            added += 1
        if added == 0 or not items or not next_cursor or next_cursor == cursor:
            break
        time.sleep(1)
        cursor = next_cursor
    return papers


def fetch_ccs(year: int) -> list[Paper]:
    container = CCS_CONTAINER.format(year=year)
    return fetch_container(
        container,
        source="CCS",
        venue=f"CCS {year}",
        year=year,
        extra_filter="type:proceedings-article",
        exact=False,
        required_substrings=(
            str(year),
            "sigsac",
            "computer and communications security",
        ),
    )


def fetch_journal(name: str, year_from: int, year_to: int) -> list[Paper]:
    issn = JOURNAL_ISSN[name]
    params = {
        "filter": (
            f"issn:{issn},from-pub-date:{year_from}-01-01,"
            f"until-pub-date:{year_to}-12-31,type:journal-article"
        ),
        "sort": "published",
        "order": "desc",
    }
    papers: list[Paper] = []
    seen: set[str] = set()
    for item in iterate_works(params):
        paper = item_to_paper(item, source=name, venue=name)
        if paper.paper_id in seen:
            continue
        seen.add(paper.paper_id)
        papers.append(paper)
    return papers


def papers_from_cached_items(
    items: list[dict[str, Any]], *, source: str, venue: str
) -> list[Paper]:
    return [item_to_paper(it, source=source, venue=venue) for it in items]
