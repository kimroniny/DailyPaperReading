from __future__ import annotations

import unittest

from paper_radar.sources.arxiv import parse_atom
from paper_radar.sources.iacr import parse_year_page
from paper_radar.sources.seconf import parse_seconf_markdown

ATOM = b"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2608.20637v1</id>
    <title>ARQ: Agentic CodeQL Query Refinement for C/C++ Vulnerability Detection</title>
    <published>2026-08-20T00:00:00Z</published>
    <summary>We refine CodeQL queries with an LLM agent.</summary>
    <arxiv:comment>Accepted to ASE 2026</arxiv:comment>
  </entry>
</feed>
"""

IACR_HTML = """
<div class="paperList">
  <div class="d-flex mb-1">
    <div class="flex-grow-1"><a href="/2026/1773">2026/1773</a>
      <a class="ms-2" href="/2026/1773.pdf">(PDF)</a>
    </div>
    <div><small>Last updated:&nbsp; 2026-08-22</small></div>
  </div>
  <div class="ms-3 ms-md-5 mb-3">
    <div class="papertitle">Enforcing Winner-Only Disclosure: Verifiable Tally Hiding for Weighted DAO Governance</div>
    <div class="paper-abstract" id="abstract-2026-1773">DAO voting abstract here.</div>
  </div>
</div>
"""

SECONF = """
| conf | title | author |
| --- | --- | --- |
| ICSE 2026 | Agentic Predicates Reasoning for Directed Fuzzing | Jie Zhu |
| ICSE 2026 | A Comprehensive Study of Concurrency Bugs in the Linux Kernel | Sishuai Gong |
"""


class ParseTests(unittest.TestCase):
    def test_arxiv_atom(self):
        papers = parse_atom(ATOM)
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0].paper_id, "2608.20637")
        self.assertIn("CodeQL", papers[0].title)
        self.assertEqual(papers[0].published, "2026-08-20")

    def test_iacr_year_html(self):
        papers = parse_year_page(IACR_HTML)
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0].paper_id, "2026/1773")
        self.assertIn("DAO", papers[0].title)
        self.assertEqual(papers[0].published, "2026-08-22")

    def test_seconf_markdown(self):
        papers = parse_seconf_markdown(SECONF)
        self.assertEqual(len(papers), 2)
        self.assertEqual(papers[0].venue, "ICSE 2026")


if __name__ == "__main__":
    unittest.main()
