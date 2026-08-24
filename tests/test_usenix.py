from __future__ import annotations

import unittest

from paper_radar.sources.usenix import extract_titles_from_contents_text


SNIPPET = """
33rd USENIX Security Symposium
August 14–16, 2024
Hardware Security I: Attacks and Defense
AttackGNN: Red-Teaming GNNs in Hardware Security Using Reinforcement Learning  . . . . . . . . . . . . . . . . . . . . . . . . .  73
Vasudev Gohil, Texas A&M University; Satwik Patnaik, University of Delaware
Fuzzing BusyBox: Leveraging LLM and Crash Reuse for Embedded Bug Hunting  . . . . . . . . . . . . . . . . . . . . . . . . . .  883
Exploring ChatGPT’s Capabilities on Vulnerability Management  . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .  811
PentestGPT: Evaluating and Harnessing Large Language Models for Automated Penetration Testing  . . . . . . . . . .  847
"""


class UsenixPdfTests(unittest.TestCase):
    def test_extract_wrapped_and_unwrapped_titles(self):
        titles = extract_titles_from_contents_text(SNIPPET)
        joined = " | ".join(titles)
        self.assertIn("AttackGNN", joined)
        self.assertIn("Fuzzing BusyBox", joined)
        self.assertIn("PentestGPT", joined)
        self.assertTrue(all("USENIX Security" not in t for t in titles))


if __name__ == "__main__":
    unittest.main()
