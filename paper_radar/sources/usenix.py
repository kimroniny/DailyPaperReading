"""USENIX Security: technical-session HTML and contents-PDF title extraction."""

from __future__ import annotations

import re
from html.parser import HTMLParser

from paper_radar.config import USENIX_CONTENTS_PDF, USENIX_SESSIONS
from paper_radar.httputil import fetch_bytes, fetch_text
from paper_radar.models import Paper

# Contents PDF lines look like:
# Title words  . . . . . . . . . . . . 145
TITLE_DOTS = re.compile(
    r"^(?P<title>.+?)\s+(?:\.\s+){3,}\s*(?P<page>\d+)\s*$",
    re.MULTILINE,
)

SKIP_TITLE = re.compile(
    r"^(wednesday|thursday|friday|monday|tuesday|saturday|sunday|"
    r"\d+(st|nd|rd|th)\s+usenix|usenix security|august |session |track |"
    r"keynote|invited talk|poster session|artifact |opening remarks|"
    r"closing remarks)",
    re.I,
)
SKIP_LINE = re.compile(
    r"(USENIX Security Symposium|Table of Contents|Philadelphia|San Diego|"
    r"Santa Clara|Anaheim|\bProceedings\b)",
    re.I,
)
SESSION_HEADER = re.compile(
    r"^[A-Za-z0-9 /&'’:-]+ (I{1,3}|IV|V|VI{0,3}|IX|X)\s*:",
)
AUTHOR_HINT = re.compile(
    r"(University|Université|Universität|Institute|College|Laboratory|"
    r"Laboratories|Ltd\.|Inc\.|GmbH|ETH Zurich|CISPA|MPI-|Google|Microsoft|"
    r"Meta |Amazon|IBM |Intel |NVIDIA)",
    re.I,
)


def _is_noise_line(line: str) -> bool:
    if not line:
        return True
    if SKIP_TITLE.search(line) or SKIP_LINE.search(line) or SESSION_HEADER.search(line):
        return True
    if AUTHOR_HINT.search(line) and not TITLE_DOTS.search(line):
        return True
    return False


def extract_titles_from_contents_text(text: str) -> list[str]:
    """Re-join wrapped PDF title lines, then pick title … page rows."""
    raw_lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    titles: list[str] = []
    seen: set[str] = set()
    buf: list[str] = []

    def emit(blob: str) -> None:
        match = TITLE_DOTS.search(blob) or re.search(
            r"^(?P<title>.+?)\s+(?:\.\s+){2,}\s*\d+\s*$", blob
        )
        if not match:
            return
        title = re.sub(r"\s+", " ", match.group("title")).strip(" \"'")
        title = title.replace("”", '"').replace("“", '"')
        if len(title) < 18 or len(title) > 240:
            return
        if SKIP_TITLE.search(title) or SKIP_LINE.search(title) or AUTHOR_HINT.search(title):
            return
        key = title.lower()
        if key in seen:
            return
        seen.add(key)
        titles.append(title)

    for line in raw_lines:
        if _is_noise_line(line):
            if buf:
                emit(" ".join(buf))
                buf = []
            continue
        buf.append(line)
        blob = " ".join(buf)
        if TITLE_DOTS.search(blob) or re.search(r"(?:\.\s+){3,}\s*\d+\s*$", blob):
            emit(blob)
            buf = []
    if buf:
        emit(" ".join(buf))
    return titles


def pdf_to_text(blob: bytes) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError as exc:
        raise RuntimeError("pypdf is required to parse USENIX contents PDFs") from exc
    import io

    reader = PdfReader(io.BytesIO(blob))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


class _SessionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._href = ""
        self._buf: list[str] = []
        self._in_link = False
        self.titles: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        if "/presentation/" in href or "/tech-session/" in href:
            self._href = href
            self._in_link = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_link:
            title = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if title and len(title) > 12:
                self.titles.append(title)
            self._in_link = False

    def handle_data(self, data: str) -> None:
        if self._in_link:
            self._buf.append(data)


def titles_from_sessions_html(html: str) -> list[str]:
    parser = _SessionParser()
    parser.feed(html)
    seen: set[str] = set()
    out: list[str] = []
    for title in parser.titles:
        key = title.lower()
        if key in seen or SKIP_TITLE.search(title):
            continue
        seen.add(key)
        out.append(title)
    return out


def papers_from_titles(titles: list[str], year: int) -> list[Paper]:
    papers: list[Paper] = []
    for idx, title in enumerate(titles, start=1):
        papers.append(
            Paper(
                paper_id=f"usenix-{year}-{idx:03d}",
                title=title,
                url=USENIX_SESSIONS.get(year) or USENIX_CONTENTS_PDF.get(year, ""),
                source="USENIX",
                venue=f"USENIX Security {year}",
                published=f"{year}-01-01",
                top_venue=True,
            )
        )
    return papers


def fetch_usenix(year: int) -> list[Paper]:
    sessions = USENIX_SESSIONS.get(year)
    if sessions:
        try:
            html = fetch_text(sessions, timeout=60)
            titles = titles_from_sessions_html(html)
            if titles:
                return papers_from_titles(titles, year)
        except Exception:
            pass
    pdf_url = USENIX_CONTENTS_PDF.get(year)
    if not pdf_url:
        return []
    blob = fetch_bytes(pdf_url, timeout=120)
    text = pdf_to_text(blob)
    return papers_from_titles(extract_titles_from_contents_text(text), year)
