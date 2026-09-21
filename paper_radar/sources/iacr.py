"""IACR ePrint: year listing (Last updated) plus RSS fallback."""

from __future__ import annotations

import re
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

from paper_radar.httputil import fetch_bytes, fetch_text
from paper_radar.models import Paper

RSS = "https://eprint.iacr.org/rss/rss.xml"
YEAR_PAGE = "https://eprint.iacr.org/{year}/?offset={offset}"

PAPER_RE = re.compile(
    r'<a href="/(?P<year>\d{4})/(?P<num>\d+)">(?P=year)/(?P=num)</a>.*?'
    r"Last updated:&nbsp;\s*(?P<updated>\d{4}-\d{2}-\d{2}).*?"
    r'<div class="papertitle">(?P<title>.*?)</div>.*?'
    r'(?:<div class="paper-abstract"[^>]*>(?P<abs>.*?)</div>)?',
    re.DOTALL,
)


def _clean(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def parse_year_page(html: str) -> list[Paper]:
    papers: list[Paper] = []
    for match in PAPER_RE.finditer(html):
        year = match.group("year")
        num = match.group("num")
        pid = f"{year}/{num}"
        title = _clean(match.group("title"))
        abstract = _clean(match.group("abs") or "")
        papers.append(
            Paper(
                paper_id=pid,
                title=title,
                url=f"https://eprint.iacr.org/{pid}",
                source="IACR",
                venue="ePrint",
                published=match.group("updated"),
                summary=abstract,
            )
        )
    return papers


def fetch_iacr_year(year: int, days: int | None = 7, max_pages: int = 6) -> list[Paper]:
    cutoff = None
    if days is not None:
        cutoff = date.today() - timedelta(days=days)
    out: list[Paper] = []
    for page in range(max_pages):
        if page:
            time.sleep(1)
        html = fetch_text(YEAR_PAGE.format(year=year, offset=page * 100), timeout=60)
        batch = parse_year_page(html)
        if not batch:
            break
        stop = False
        for paper in batch:
            if cutoff and paper.published:
                try:
                    pub = date.fromisoformat(paper.published)
                except ValueError:
                    pub = None
                if pub is not None and pub < cutoff:
                    stop = True
                    continue
            out.append(paper)
        if stop or len(batch) < 50:
            break
    return out


def parse_rss(blob: bytes, days: int | None = 7) -> list[Paper]:
    cutoff = None
    if days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    root = ET.fromstring(blob)
    papers: list[Paper] = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub_raw = item.findtext("pubDate") or ""
        published = None
        pub_dt = None
        if pub_raw:
            try:
                pub_dt = parsedate_to_datetime(pub_raw)
                published = pub_dt.date().isoformat()
            except (TypeError, ValueError):
                pub_dt = None
        if cutoff and pub_dt is not None and pub_dt < cutoff:
            continue
        pid = link.rstrip("/").replace("https://eprint.iacr.org/", "").replace(
            "http://eprint.iacr.org/", ""
        )
        if not pid:
            continue
        papers.append(
            Paper(
                paper_id=pid,
                title=title,
                url=link or f"https://eprint.iacr.org/{pid}",
                source="IACR",
                venue="ePrint",
                published=published,
                summary=" ".join(desc.split()),
            )
        )
    return papers


def fetch_iacr(days: int = 7) -> list[Paper]:
    year = date.today().year
    papers = fetch_iacr_year(year, days=days)
    # New-year boundary: also scan previous year if we are in early January.
    if date.today().month == 1:
        papers.extend(fetch_iacr_year(year - 1, days=days, max_pages=2))
    if papers:
        return _dedupe(papers)
    blob = fetch_bytes(RSS, timeout=60)
    return _dedupe(parse_rss(blob, days=days))


def _dedupe(papers: list[Paper]) -> list[Paper]:
    seen: set[str] = set()
    out: list[Paper] = []
    for paper in papers:
        if paper.paper_id in seen:
            continue
        seen.add(paper.paper_id)
        out.append(paper)
    return out
