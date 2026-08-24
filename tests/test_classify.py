from __future__ import annotations

import unittest

from paper_radar.classify import classify_text, score_paper, select_digest
from paper_radar.models import Paper


class ClassifyTests(unittest.TestCase):
    def test_c_vuln_management(self):
        self.assertEqual(
            classify_text("Exploring ChatGPT’s Capabilities on Vulnerability Management"),
            "C",
        )

    def test_c_pentestgpt(self):
        self.assertEqual(classify_text("PentestGPT: Evaluating and Harnessing Large Language Models for Automated Penetration Testing"), "C")

    def test_c_fuzz_busybox(self):
        self.assertEqual(
            classify_text("Fuzzing BusyBox: Leveraging LLM and Crash Reuse for Embedded Bug Hunting"),
            "C",
        )

    def test_c_chain_llm_smartaudit(self):
        self.assertEqual(
            classify_text(
                "LLM-SmartAudit: Advanced Smart Contract Vulnerability Detection via LLM-Powered Multi-Agent Systems"
            ),
            "C-chain",
        )

    def test_c_chain_llm_plus_contract_security(self):
        self.assertEqual(
            classify_text(
                "NumScout: Unveiling Numerical Defects in Smart Contracts using LLM-pruning Symbolic Execution"
            ),
            "C-chain",
        )

    def test_a_rollup_dos(self):
        self.assertEqual(
            classify_text("Denial of Sequencing: L2 Rollup Liveness Attacks"),
            "A",
        )

    def test_a_randao(self):
        self.assertEqual(classify_text("Forking the RANDAO: Manipulating Ethereum Proposer Selection"), "A")

    def test_a_poseidon_zk(self):
        self.assertEqual(
            classify_text("Midpoint Reset: A Full-Round Poseidon Collision from an Adaptively Chosen MDS Matrix"),
            "A",
        )

    def test_drop_traditional_security(self):
        self.assertEqual(
            classify_text("A Comprehensive Study of Concurrency Bugs in the Linux Kernel"),
            "",
        )

    def test_drop_jailbreak(self):
        self.assertEqual(
            classify_text("Universal Jailbreak Attacks against Large Language Models"),
            "",
        )

    def test_drop_generic_apr_without_security(self):
        self.assertEqual(
            classify_text("A Semantic-based Optimization Approach for Repairing LLMs: Case Study on Code Generation"),
            "",
        )

    def test_drop_program_repair_benchmark(self):
        self.assertEqual(
            classify_text(
                "OdinEval: A Reproducible Benchmark for LLM-Based Program Repair in the Odin Programming Language"
            ),
            "",
        )

    def test_drop_incidental_security_patch_in_abstract(self):
        self.assertEqual(
            classify_text(
                "BreakGuard: Towards Detecting Dependency Breaking Changes with LLM-Generated Tests",
                "Libraries may add features, fix bugs, or apply security patches. We use a large language model.",
            ),
            "",
        )

    def test_drop_zk_only_in_abstract(self):
        self.assertEqual(
            classify_text(
                "Z2-ACT: End-to-End Verifiable Agentic Intent Control for Open 6G RAN",
                "We use zero-knowledge proofs for intent control with an agentic LLM.",
            ),
            "",
        )

    def test_abstract_may_supply_llm_for_security_title(self):
        self.assertEqual(
            classify_text(
                "Vibe Coding and Web Application Security: A Twin-Prompt Study",
                "We prompt a large language model to generate web apps.",
            ),
            "C",
        )

    def test_drop_traditional_dl_vuln_detector(self):
        self.assertEqual(
            classify_text(
                "A Scalable Vulnerability Detection System with Multi-View Graph Representations",
                "Deep learning and large language models have been used in prior work.",
            ),
            "",
        )

    def test_solidity_tools_without_llm_is_a(self):
        self.assertEqual(
            classify_text("An empirical analysis of vulnerability detection tools for solidity smart contracts"),
            "A",
        )

    def test_shield_broken(self):
        self.assertEqual(
            classify_text("The Shield is Broken: Attacks on LLM-based Vulnerability Detectors"),
            "C",
        )

    def test_select_digest_caps_and_drops_noise(self):
        papers = [
            Paper("1", "PentestGPT for Automated Penetration Testing with LLMs", "u", "arXiv", category="C"),
            Paper("2", "Random notes", "u", "arXiv", category=""),
            Paper("3", "Denial of Sequencing on Ethereum Rollups", "u", "CCS", venue="CCS 2025", category="A", top_venue=True),
        ]
        for p in papers:
            if not p.category:
                p.category = classify_text(p.title)
        picked = select_digest(papers, limit=12)
        ids = [p.paper_id for p in picked]
        self.assertIn("1", ids)
        self.assertIn("3", ids)
        self.assertNotIn("2", ids)
        self.assertGreater(score_paper(picked[0]), 0)


if __name__ == "__main__":
    unittest.main()
