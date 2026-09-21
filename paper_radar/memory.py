"""Append-only radar memory: YYYY-MM-DD | source | id | venue | title"""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path
from typing import Iterable

from paper_radar.models import Paper

LINE_RE = re.compile(
    r"^(?P<day>\d{4}-\d{2}-\d{2})\s*\|\s*(?P<source>[^|]+)\s*\|\s*"
    r"(?P<pid>[^|]+)\s*\|\s*(?P<venue>[^|]+)\s*\|\s*(?P<title>.+?)\s*$"
)


def parse_memory(text: str) -> set[str]:
    ids: set[str] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("Format:"):
            continue
        match = LINE_RE.match(line)
        if match:
            ids.add(match.group("pid").strip().lower())
    return ids


def load_seen_ids(path: Path | None) -> set[str]:
    if path is None or not path.exists():
        return set()
    return parse_memory(path.read_text(encoding="utf-8"))


def filter_unseen(papers: Iterable[Paper], seen: set[str]) -> list[Paper]:
    out: list[Paper] = []
    for paper in papers:
        if paper.paper_id.lower() in seen:
            continue
        out.append(paper)
    return out


def format_memory_block(papers: Iterable[Paper], day: date | None = None) -> str:
    day = day or date.today()
    lines = [f"## {day.isoformat()}", ""]
    for paper in papers:
        lines.append(paper.memory_line(day))
    lines.append("")
    return "\n".join(lines)


def append_memory(path: Path, papers: Iterable[Paper], day: date | None = None) -> None:
    papers = list(papers)
    if not papers:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    block = format_memory_block(papers, day)
    existing = path.read_text(encoding="utf-8") if path.exists() else (
        "# Paper radar memory (append-only)\n\n"
        "Format: YYYY-MM-DD | source | id | venue_or_arxiv | title\n\n"
    )
    if not existing.endswith("\n"):
        existing += "\n"
    path.write_text(existing + block, encoding="utf-8")
