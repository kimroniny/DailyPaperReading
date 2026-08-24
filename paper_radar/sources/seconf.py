"""Parse iCSawyer/SEConfPaperList-style markdown tables (ICSE/FSE/ASE/ISSTA)."""

from __future__ import annotations

import re
from pathlib import Path

from paper_radar.models import Paper

ROW = re.compile(
    r"^\|\s*(?P<conf>[^|]+)\s*\|\s*(?P<title>.*?)\s*\|\s*(?P<author>.*?)\s*\|?\s*$"
)


def parse_seconf_markdown(text: str) -> list[Paper]:
    papers: list[Paper] = []
    seen: set[tuple[str, str]] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            continue
        match = ROW.match(line)
        if not match:
            continue
        conf = match.group("conf").strip()
        title = match.group("title").strip().strip('"')
        if conf.lower() in {"conf", "---"} or set(conf) <= {"-"}:
            continue
        if not title or title.lower() == "title":
            continue
        key = (conf.lower(), title.lower())
        if key in seen:
            continue
        seen.add(key)
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower())[:60].strip("-")
        papers.append(
            Paper(
                paper_id=f"{conf}:{slug}",
                title=title,
                url="",
                source="SEConf",
                venue=conf,
                top_venue=True,
            )
        )
    return papers


def load_seconf(path: Path) -> list[Paper]:
    return parse_seconf_markdown(path.read_text(encoding="utf-8"))
