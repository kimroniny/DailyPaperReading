"""Slack mrkdwn digest: clickable titles, one-line takeaway, no abstracts."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import date

from paper_radar.models import Paper

SECTION = {
    "C": "*C · LLM → 漏洞检测 / 修复 / fuzz / 审计*",
    "C-chain": "*C-chain · LLM + 合约 / 链上对象*",
    "A": "*A · 区块链 / Web3 / 协议安全*",
}

_PAGE_COMMENT = re.compile(
    r"^(\d+\s+pages?(\s*,\s*\d+\s+figures?)?|preprint|accepted( for| to)?\b)",
    re.I,
)


def canonical_url(paper: Paper) -> str:
    url = (paper.url or "").strip()
    url = url.replace("http://arxiv.org/", "https://arxiv.org/")
    url = re.sub(r"(arxiv\.org/abs/[\d.]+)v\d+$", r"\1", url)
    return url


def _clip(text: str, limit: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:") + "…"


def link_title(title: str, limit: int = 88) -> str:
    text = re.sub(r"\s+", " ", title).strip()
    text = text.replace("|", "/").replace("<", "(").replace(">", ")")
    return _clip(text, limit)


def one_liner(paper: Paper, limit: int = 100) -> str:
    """First sentence of the abstract. Ignore arXiv 'N pages' comments."""
    raw = (paper.summary or "").strip()
    if not raw:
        comment = (paper.comment or "").strip()
        if comment and not _PAGE_COMMENT.match(comment):
            raw = comment
    raw = re.sub(r"\s+", " ", raw)
    if not raw:
        return ""
    sentence = re.split(r"(?<=[.。])\s+", raw, maxsplit=1)[0]
    sentence = sentence.strip()
    return _clip(sentence, limit)


def format_slack(
    papers: list[Paper],
    *,
    heading: str | None = None,
    days: int | None = 7,
    day: date | None = None,
    footer: str = "宁缺毋滥 · 非 LLM 的传统安全不收录",
) -> str:
    day = day or date.today()
    if heading is None:
        n = len(papers)
        window = f"最近 {days} 天 · " if days else ""
        heading = f"*论文雷达 · {day.isoformat()} · {window}{n} 篇*"

    if not papers:
        return f"{heading}\n本轮无足够相关的论文（宁缺毋滥）。"

    grouped: dict[str, list[Paper]] = defaultdict(list)
    for paper in papers:
        grouped[paper.category or "A"].append(paper)

    chunks = [heading]
    n = 1
    for cat in ("C", "C-chain", "A"):
        items = grouped.get(cat) or []
        if not items:
            continue
        chunks.append("")
        chunks.append(SECTION[cat])
        for paper in items:
            url = canonical_url(paper)
            title = link_title(paper.title)
            venue = paper.venue or paper.source
            if venue.lower() in {"arxiv only", "arxiv"}:
                venue = "arXiv"
            meta = f"{venue} `{paper.paper_id}`"
            if url:
                chunks.append(f"*{n}.* <{url}|{title}>")
            else:
                chunks.append(f"*{n}.* {title}")
            blurb = one_liner(paper)
            if blurb:
                chunks.append(f"{meta}  ·  {blurb}")
            else:
                chunks.append(meta)
            chunks.append("")
            n += 1

    chunks.append(f"_{footer}_")
    return "\n".join(chunks).rstrip() + "\n"
