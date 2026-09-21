from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Paper:
    paper_id: str
    title: str
    url: str
    source: str
    venue: str = "arXiv only"
    published: Optional[str] = None
    summary: str = ""
    category: str = ""  # A, C, C-chain, or empty (drop)
    relevance: str = "高"
    tags: list[str] = field(default_factory=list)
    traditional_object: bool = False
    top_venue: bool = False
    comment: str = ""

    def memory_line(self, day: date) -> str:
        return (
            f"{day.isoformat()} | {self.source} | {self.paper_id} | "
            f"{self.venue} | {self.title}"
        )
