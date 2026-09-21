from __future__ import annotations

import unittest

from paper_radar.format_slack import canonical_url, format_slack, one_liner
from paper_radar.models import Paper


def _p(**kwargs) -> Paper:
    base = dict(
        paper_id="2608.21107",
        title="Large Language Models at the Intersection of Software Engineering and Software Security",
        url="https://arxiv.org/abs/2608.21107v1",
        source="arXiv",
        venue="arXiv only",
        category="C",
        summary="LLMs are moving from code completion toward repository-scale agents. Extra sentence.",
    )
    base.update(kwargs)
    return Paper(**base)


class SlackFormatTests(unittest.TestCase):
    def test_clickable_title_and_no_markdown_headers(self):
        text = format_slack([_p()])
        self.assertIn("<https://arxiv.org/abs/2608.21107|", text)
        self.assertNotIn("# ", text)
        self.assertNotIn("## ", text)
        self.assertIn("*C ·", text)

    def test_one_liner_not_full_abstract(self):
        paper = _p(summary="First sentence is short. " + ("long " * 80))
        blurb = one_liner(paper, limit=100)
        self.assertTrue(blurb.startswith("First sentence"))
        self.assertLessEqual(len(blurb), 100)
        text = format_slack([paper])
        self.assertNotIn("long long long", text)

    def test_ignores_arxiv_page_comment(self):
        paper = _p(summary="Real abstract sentence.", comment="8 pages, 3 figures")
        self.assertEqual(one_liner(paper), "Real abstract sentence.")

    def test_canonical_arxiv_url_drops_version(self):
        self.assertEqual(
            canonical_url(_p()),
            "https://arxiv.org/abs/2608.21107",
        )

    def test_empty(self):
        text = format_slack([])
        self.assertIn("无足够相关", text)


if __name__ == "__main__":
    unittest.main()
