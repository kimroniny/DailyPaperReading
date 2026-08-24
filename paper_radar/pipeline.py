"""Daily 7-day scan and multi-year venue scan."""

from __future__ import annotations

import json
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any, Callable, Iterable

from paper_radar.classify import classify_paper, select_digest
from paper_radar.format_digest import format_digest
from paper_radar.format_slack import format_slack
from paper_radar.memory import append_memory, filter_unseen, load_seen_ids
from paper_radar.models import Paper
from paper_radar.sources.arxiv import fetch_arxiv
from paper_radar.sources.crossref import (
    fetch_ccs,
    fetch_journal,
    papers_from_cached_items,
)
from paper_radar.sources.iacr import fetch_iacr
from paper_radar.sources.seconf import load_seconf
from paper_radar.sources.usenix import (
    extract_titles_from_contents_text,
    fetch_usenix,
    papers_from_titles,
)


YEAR_RE = re.compile(r"\b(20\d{2})\b")


def paper_year(paper: Paper) -> int | None:
    if paper.published:
        try:
            return int(paper.published[:4])
        except ValueError:
            pass
    for blob in (paper.venue, paper.paper_id, paper.title):
        match = YEAR_RE.search(blob or "")
        if match:
            return int(match.group(1))
    return None


def in_year_range(paper: Paper, year_from: int, year_to: int) -> bool:
    year = paper_year(paper)
    if year is None:
        return True
    return year_from <= year <= year_to


def classify_all(papers: Iterable[Paper]) -> list[Paper]:
    out: list[Paper] = []
    for paper in papers:
        classify_paper(paper)
        if paper.category:
            out.append(paper)
    return out


def run_daily(
    days: int = 7,
    *,
    limit: int = 12,
    memory_path: Path | None = None,
    write_memory: bool = False,
    arxiv_fetcher: Callable[..., list[Paper]] = fetch_arxiv,
    iacr_fetcher: Callable[..., list[Paper]] = fetch_iacr,
    skip_arxiv: bool = False,
    skip_iacr: bool = False,
) -> dict[str, Any]:
    harvested: list[Paper] = []
    errors: list[str] = []
    if not skip_arxiv:
        try:
            harvested.extend(arxiv_fetcher(days=days))
        except Exception as exc:
            errors.append(f"arxiv: {exc}")
    if not skip_iacr:
        try:
            harvested.extend(iacr_fetcher(days=days))
        except Exception as exc:
            errors.append(f"iacr: {exc}")

    relevant = classify_all(harvested)
    seen = load_seen_ids(memory_path)
    unseen = filter_unseen(relevant, seen)
    digest_papers = select_digest(unseen, limit=limit)
    if write_memory and memory_path is not None:
        append_memory(memory_path, digest_papers)

    return {
        "mode": "daily",
        "days": days,
        "harvested": len(harvested),
        "relevant": len(relevant),
        "unseen": len(unseen),
        "selected": digest_papers,
        "digest": format_digest(digest_papers, days=days),
        "slack": format_slack(digest_papers, days=days),
        "errors": errors,
    }


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("items") or data.get("message", {}).get("items") or []
    return []


def load_cache_dir(cache_dir: Path) -> list[Paper]:
    papers: list[Paper] = []
    mapping = {
        "ccs24.json": ("CCS", "CCS 2024"),
        "ccs25.json": ("CCS", "CCS 2025"),
        "ccs26.json": ("CCS", "CCS 2026"),
        "tse.json": ("TSE", "TSE"),
        "tosem.json": ("TOSEM", "TOSEM"),
        "emse.json": ("EMSE", "EMSE"),
    }
    for name, (source, venue) in mapping.items():
        path = cache_dir / name
        if path.exists():
            papers.extend(
                papers_from_cached_items(_load_json_list(path), source=source, venue=venue)
            )
    for year, fname in ((2024, "sec24_contents.txt"), (2025, "sec25_contents.txt")):
        path = cache_dir / fname
        if path.exists():
            titles = extract_titles_from_contents_text(path.read_text(encoding="utf-8"))
            papers.extend(papers_from_titles(titles, year))
    return papers


def run_venues(
    years: tuple[int, int] = (2024, 2026),
    *,
    sources: Iterable[str] = ("ccs", "journals", "usenix"),
    cache_dir: Path | None = None,
    seconf_path: Path | None = None,
    live: bool = False,
) -> dict[str, Any]:
    wanted = {s.strip().lower() for s in sources}
    harvested: list[Paper] = []
    errors: list[str] = []
    year_from, year_to = years
    year_list = list(range(year_from, year_to + 1))

    if cache_dir is not None and cache_dir.exists():
        harvested.extend(load_cache_dir(cache_dir))

    if seconf_path is not None and seconf_path.exists() and "seconf" in wanted:
        harvested.extend(load_seconf(seconf_path))

    if live:
        if "ccs" in wanted:
            for year in year_list:
                try:
                    harvested.extend(fetch_ccs(year))
                except Exception as exc:
                    errors.append(f"ccs {year}: {exc}")
        if "journals" in wanted:
            for name in ("TSE", "TOSEM", "EMSE"):
                try:
                    harvested.extend(fetch_journal(name, year_from, year_to))
                except Exception as exc:
                    errors.append(f"{name}: {exc}")
        if "usenix" in wanted:
            for year in year_list:
                try:
                    harvested.extend(fetch_usenix(year))
                except Exception as exc:
                    errors.append(f"usenix {year}: {exc}")

    # Dedupe by id then title
    seen_id: set[str] = set()
    seen_title: set[str] = set()
    unique: list[Paper] = []
    for paper in harvested:
        pid = paper.paper_id.lower()
        title_key = paper.title.lower()
        if pid in seen_id or title_key in seen_title:
            continue
        seen_id.add(pid)
        seen_title.add(title_key)
        unique.append(paper)

    unique = [p for p in unique if in_year_range(p, year_from, year_to)]
    relevant = classify_all(unique)
    by_cat: dict[str, int] = {"A": 0, "C": 0, "C-chain": 0}
    by_venue: dict[str, int] = {}
    for paper in relevant:
        by_cat[paper.category] = by_cat.get(paper.category, 0) + 1
        by_venue[paper.venue] = by_venue.get(paper.venue, 0) + 1

    top = select_digest(relevant, limit=40)
    return {
        "mode": "venues",
        "years": f"{year_from}-{year_to}",
        "harvested": len(unique),
        "relevant": len(relevant),
        "by_category": by_cat,
        "by_venue": by_venue,
        "selected": top,
        "all_relevant": relevant,
        "digest": format_digest(
            top,
            days=0,
            title=f"顶会顶刊扫描 {year_from}–{year_to}（相关摘录）",
        ),
        "slack": format_slack(
            top,
            heading=f"*顶会顶刊补扫 · {year_from}–{year_to} · 精选 {len(top)} 篇*",
            days=None,
        ),
        "errors": errors,
    }


def papers_to_json(papers: list[Paper]) -> list[dict[str, Any]]:
    rows = []
    for paper in papers:
        row = asdict(paper)
        rows.append(row)
    return rows


def parse_years(spec: str) -> tuple[int, int]:
    spec = spec.strip()
    if "-" in spec:
        a, b = spec.split("-", 1)
        return int(a), int(b)
    year = int(spec)
    return year, year
