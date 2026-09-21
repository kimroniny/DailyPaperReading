from __future__ import annotations

import tempfile
import unittest
from datetime import date
from pathlib import Path

from paper_radar.memory import append_memory, load_seen_ids, parse_memory
from paper_radar.models import Paper


SAMPLE = """# Paper radar memory (append-only)

Format: YYYY-MM-DD | source | id | venue_or_arxiv | title

## 2026-08-24

2026-08-24 | arXiv | 2608.20637 | arXiv | ARQ: Agentic CodeQL Query Refinement
2026-08-24 | IACR | 2026/1757 | ePrint | Enabling Threshold Custody
"""


class MemoryTests(unittest.TestCase):
    def test_parse_ids(self):
        ids = parse_memory(SAMPLE)
        self.assertEqual(ids, {"2608.20637", "2026/1757"})

    def test_append_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "MEMORIES.md"
            path.write_text(SAMPLE, encoding="utf-8")
            paper = Paper(
                paper_id="2608.99999",
                title="New Paper",
                url="https://arxiv.org/abs/2608.99999",
                source="arXiv",
                venue="arXiv only",
            )
            append_memory(path, [paper], day=date(2026, 8, 25))
            seen = load_seen_ids(path)
            self.assertIn("2608.99999", seen)
            self.assertIn("2608.20637", seen)


if __name__ == "__main__":
    unittest.main()
