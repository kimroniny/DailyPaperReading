"""Human-readable digest (Chinese headings, English titles)."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from paper_radar.models import Paper

SECTION = {
    "C": "C · LLM / Agent 用于漏洞检测、修复、fuzz、审计",
    "C-chain": "C-chain · LLM + 区块链 / 智能合约安全对象",
    "A": "A · 区块链 / Web3 / 协议安全",
}


def format_digest(
    papers: list[Paper],
    *,
    days: int = 7,
    title: str | None = None,
    day: date | None = None,
) -> str:
    day = day or date.today()
    heading = title or f"软件安全论文雷达（最近 {days} 天 · {day.isoformat()}）"
    lines = [f"# {heading}", ""]
    if not papers:
        lines.append("本轮无足够相关的论文（宁缺毋滥）。")
        return "\n".join(lines) + "\n"

    grouped: dict[str, list[Paper]] = defaultdict(list)
    for paper in papers:
        grouped[paper.category].append(paper)

    n = 1
    for cat in ("C", "C-chain", "A"):
        items = grouped.get(cat) or []
        if not items:
            continue
        lines.append(f"## {SECTION[cat]}")
        lines.append("")
        for paper in items:
            venue = paper.venue or paper.source
            lines.append(f"{n}. **{paper.title}**")
            lines.append(f"   - {venue} · `{paper.paper_id}`")
            lines.append(f"   - {paper.url}")
            if paper.comment:
                lines.append(f"   - {paper.comment}")
            elif paper.summary:
                snippet = paper.summary.strip().replace("\n", " ")
                if len(snippet) > 220:
                    snippet = snippet[:217] + "..."
                lines.append(f"   - {snippet}")
            lines.append("")
            n += 1

    lines.append("筛选标准：宁缺毋滥；非 LLM 的传统安全工作即使来自顶会也不收录。")
    lines.append("")
    return "\n".join(lines)
