from __future__ import annotations

import unittest
from datetime import date

from paper_radar.classify import classify_paper
from paper_radar.models import Paper
from paper_radar.pipeline import run_daily


def fake_arxiv(days: int = 7) -> list[Paper]:
    return [
        Paper(
            paper_id="2608.20637",
            title="ARQ: Agentic CodeQL Query Refinement for C/C++ Vulnerability Detection",
            url="https://arxiv.org/abs/2608.20637",
            source="arXiv",
            summary="LLM agent refines CodeQL for vulnerability detection.",
            published=date.today().isoformat(),
        ),
        Paper(
            paper_id="2608.00001",
            title="A Comprehensive Study of Concurrency Bugs in the Linux Kernel",
            url="https://arxiv.org/abs/2608.00001",
            source="arXiv",
            published=date.today().isoformat(),
        ),
    ]


def fake_iacr(days: int = 7) -> list[Paper]:
    return [
        Paper(
            paper_id="2026/1773",
            title="Enforcing Winner-Only Disclosure: Verifiable Tally Hiding for Weighted DAO Governance",
            url="https://eprint.iacr.org/2026/1773",
            source="IACR",
            venue="ePrint",
            published=date.today().isoformat(),
        )
    ]


class PipelineTests(unittest.TestCase):
    def test_daily_filters_and_selects(self):
        result = run_daily(
            days=7,
            limit=12,
            arxiv_fetcher=fake_arxiv,
            iacr_fetcher=fake_iacr,
        )
        ids = {p.paper_id for p in result["selected"]}
        self.assertIn("2608.20637", ids)
        self.assertIn("2026/1773", ids)
        self.assertNotIn("2608.00001", ids)
        for paper in result["selected"]:
            classify_paper(paper)
            self.assertTrue(paper.category)

    def test_memory_dedup(self):
        import tempfile
        from pathlib import Path

        from paper_radar.memory import append_memory

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "m.md"
            first = run_daily(
                days=7,
                memory_path=path,
                write_memory=True,
                arxiv_fetcher=fake_arxiv,
                iacr_fetcher=fake_iacr,
            )
            self.assertGreater(len(first["selected"]), 0)
            second = run_daily(
                days=7,
                memory_path=path,
                arxiv_fetcher=fake_arxiv,
                iacr_fetcher=fake_iacr,
            )
            self.assertEqual(second["selected"], [])


if __name__ == "__main__":
    unittest.main()
