"""arXiv Atom API: recent cs.CR / cs.SE (and optional keyword) submissions."""

from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Iterable
from urllib.parse import urlencode

from paper_radar.config import ARXIV_CATS_DEFAULT
from paper_radar.httputil import fetch_bytes
from paper_radar.models import Paper

ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"
API = "http://export.arxiv.org/api/query"


def _text(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def _local_id(arxiv_id: str) -> str:
    # http://arxiv.org/abs/2608.20637v1 -> 2608.20637
    ident = arxiv_id.rsplit("/", 1)[-1]
    return ident.split("v")[0]


def parse_atom(blob: bytes) -> list[Paper]:
    root = ET.fromstring(blob)
    papers: list[Paper] = []
    for entry in root.findall(f"{ATOM}entry"):
        raw_id = _text(entry.find(f"{ATOM}id"))
        pid = _local_id(raw_id)
        title = " ".join(_text(entry.find(f"{ATOM}title")).split())
        summary = " ".join(_text(entry.find(f"{ATOM}summary")).split())
        published = _text(entry.find(f"{ATOM}published"))[:10]
        html = raw_id.replace("http://arxiv.org/abs/", "https://arxiv.org/abs/")
        comment = _text(entry.find(f"{ARXIV_NS}comment"))
        journal = _text(entry.find(f"{ARXIV_NS}journal_ref"))
        venue = journal or "arXiv only"
        paper = Paper(
            paper_id=pid,
            title=title,
            url=html if html.startswith("http") else f"https://arxiv.org/abs/{pid}",
            source="arXiv",
            venue=venue,
            published=published or None,
            summary=summary,
            comment=comment,
            top_venue=bool(journal),
        )
        papers.append(paper)
    return papers


def _window_query(cats: Iterable[str], extra: str | None) -> str:
    cat_q = " OR ".join(f"cat:{c}" for c in cats)
    if extra:
        return f"({cat_q}) AND ({extra})"
    return cat_q


def fetch_arxiv(
    days: int = 7,
    *,
    cats: Iterable[str] = ARXIV_CATS_DEFAULT,
    extra_query: str | None = None,
    page_size: int = 100,
    max_pages: int = 12,
) -> list[Paper]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = _window_query(cats, extra_query)
    out: list[Paper] = []
    seen: set[str] = set()
    for page in range(max_pages):
        params = urlencode(
            {
                "search_query": query,
                "start": page * page_size,
                "max_results": page_size,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
            }
        )
        if page:
            time.sleep(3)
        blob = fetch_bytes(f"{API}?{params}", timeout=90)
        batch = parse_atom(blob)
        if not batch:
            break
        stop = False
        for paper in batch:
            if paper.paper_id in seen:
                continue
            if paper.published:
                try:
                    pub = datetime.strptime(paper.published, "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                except ValueError:
                    pub = None
                if pub is not None and pub < cutoff:
                    stop = True
                    continue
            seen.add(paper.paper_id)
            out.append(paper)
        if stop or len(batch) < page_size:
            break
    return out
