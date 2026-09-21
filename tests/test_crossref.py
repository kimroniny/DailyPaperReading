from __future__ import annotations

import unittest

from paper_radar.sources.crossref import _container_ok


class CrossrefMatchTests(unittest.TestCase):
    def test_ccs2024_on_acm_variant(self):
        got = "Proceedings of the 2024 on ACM SIGSAC Conference on Computer and Communications Security"
        self.assertTrue(
            _container_ok(
                got,
                "Proceedings of the 2024 ACM SIGSAC Conference on Computer and Communications Security",
                exact=False,
                required_substrings=("2024", "sigsac", "computer and communications security"),
            )
        )

    def test_rejects_other_acm_conference(self):
        got = "Proceedings of the 2024 ACM SIGSOFT International Symposium on Software Testing"
        self.assertFalse(
            _container_ok(
                got,
                "x",
                exact=False,
                required_substrings=("2024", "sigsac", "computer and communications security"),
            )
        )


if __name__ == "__main__":
    unittest.main()
