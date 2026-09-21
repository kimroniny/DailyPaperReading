"""A / C / C-chain classifier.

A: blockchain / Web3 / protocol security (LLM not required).
C: LLM / agent / foundation model applied to vuln detect, repair, fuzz, audit, testing.
C-chain: C whose object is a blockchain / smart-contract system.
Drop: traditional (non-LLM) security, jailbreaks, LLM-privacy, generic APR.

Title carries the decision. Abstracts may confirm LLM or a *strong* task
phrase; they must not promote a paper via generic words like exploit/bug.
"""

from __future__ import annotations

import re

from paper_radar.models import Paper

_WORD = r"[a-z0-9]"


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _has(text: str, terms: tuple[str, ...]) -> bool:
    t = _norm(text)
    for term in terms:
        term = term.lower()
        if re.search(r"[^a-z0-9]", term):
            if term in t:
                return True
        elif re.search(rf"(?<!{_WORD}){re.escape(term)}(?!{_WORD})", t):
            return True
    return False


LLM_TERMS = (
    "large language model",
    "language model",
    "foundation model",
    "generative ai",
    "chatgpt",
    "gpt-4",
    "gpt-3",
    "gpt4",
    "llm-based",
    "llm based",
    "llm-powered",
    "llm powered",
    "llm-assisted",
    "llm assisted",
    "code llm",
    "llms",
    "llm",
    "genai",
    "copilot",
    "codebert",
    "graphcodebert",
    "unixcoder",
    "codet5",
    "starcode",
    "deepseek-coder",
    "multi-agent",
    "multi agent",
    "llm agent",
    "agentic",
    "vibe coding",
)

# Short task words: safe on titles, too noisy in abstracts.
TITLE_TASK_TERMS = (
    "vulnerability",
    "vulnerabilities",
    "vuln",
    "cve",
    "fuzzing",
    "fuzzer",
    "fuzz",
    "pentest",
    "penetration test",
    "penetration testing",
    "sast",
    "dast",
    "codeql",
    "security patch",
    "patch backport",
    "vulnerability detection",
    "vulnerability repair",
    "vulnerability localization",
    "vulnerability management",
    "insecure code",
    "vulnerable code",
    "secure coding",
    "smart contract audit",
    "security audit",
    "zero-day",
    "0-day",
    "memory safety",
    "use-after-free",
    "buffer overflow",
    "software security",
    "application security",
    "web application security",
)

# Abstract must say the actual job, not just "attackers may exploit".
ABSTRACT_TASK_TERMS = (
    "vulnerability detection",
    "vulnerability repair",
    "vulnerability localization",
    "vulnerability management",
    "automated penetration",
    "penetration testing",
    "llm-assisted fuzz",
    "assisted fuzzing",
    "smart contract vulnerability",
    "smart-contract vulnerability",
    "patch backport",
)

SECURITY_OBJECT_TITLE = (
    "software security",
    "application security",
    "web application",
    "smart contract",
    "solidity",
    "vulnerability",
    "fuzzing",
    "pentest",
    "codeql",
    "sast",
    "secure coding",
    "insecure",
)

BLOCKCHAIN_TITLE_TERMS = (
    "blockchain",
    "block chain",
    "smart contract",
    "smart contracts",
    "ethereum",
    "solidity",
    "bitcoin",
    "defi",
    "decentralized finance",
    "web3",
    "cryptocurrency",
    "layer-2",
    "layer 2",
    "l2 rollup",
    "optimistic rollup",
    "zk-rollup",
    "zk rollup",
    "rollup",
    "mempool",
    "maximal extractable",
    "miner extractable",
    "mev",
    "frontrunning",
    "front-running",
    "sandwich attack",
    "restaking",
    "randao",
    "sequencer",
    "cross-chain",
    "cross chain",
    "lightning network",
    "evm",
    "vyper",
    "consensus client",
    "proof-of-stake",
    "proof of stake",
    "dao governance",
    "dao ",
    "on-chain",
    "gas-wasting",
    "gas wasting",
    "reentrancy",
    "erc-20",
    "erc20",
    "solana",
    "aptos",
    "polkadot",
    "threshold custody",
    "poseidon",
    "circom",
)

# Abstract may upgrade C → C-chain only with an unambiguous chain object.
BLOCKCHAIN_ABSTRACT_TERMS = (
    "smart contract",
    "smart contracts",
    "ethereum",
    "solidity",
    "blockchain",
    "defi",
    "web3",
    "evm",
    "rollup",
)

EXCLUDE_TERMS = (
    "jailbreak",
    "jailbreaks",
    "jail-break",
    "jail break",
    "prompt injection",
    "membership inference",
    "model inversion",
    "machine unlearning",
    "watermarking",
    "watermark",
    "deepfake",
    "steganograph",
    "rlhf",
    "llm privacy",
    "misinformation",
    "knowledge poisoning",
    "side channel",
    "side-channel",
    "prefix-cache",
    "model context protocol",
)

KEEP_DESPITE_EXCLUDE = (
    "vulnerability detection",
    "fuzzing",
    "smart contract",
    "pentest",
    "codeql",
    "sast",
)


def _has_llm(text: str) -> bool:
    return _has(text, LLM_TERMS)


def _has_title_task(title: str) -> bool:
    return _has(title, TITLE_TASK_TERMS) or _has(title, SECURITY_OBJECT_TITLE)


def _has_abs_task(summary: str) -> bool:
    return _has(summary, ABSTRACT_TASK_TERMS)


def _has_chain_title(title: str) -> bool:
    return _has(title, BLOCKCHAIN_TITLE_TERMS)


def _excluded(text: str) -> bool:
    if not _has(text, EXCLUDE_TERMS):
        return False
    if _has(text, KEEP_DESPITE_EXCLUDE):
        return False
    return True


def classify_text(title: str, summary: str = "") -> str:
    """Return 'A', 'C', 'C-chain', or '' (drop)."""
    if _excluded(title):
        return ""
    if _excluded(summary) and not _has_title_task(title) and not _has_chain_title(title):
        return ""

    llm = _has_llm(title)
    chain_title = _has_chain_title(title)
    sec_title = _has_title_task(title)
    sec = sec_title or (_has_llm(title) and _has_abs_task(summary))

    if llm and sec and chain_title:
        return "C-chain"
    if llm and sec and _has(summary, BLOCKCHAIN_ABSTRACT_TERMS) and sec_title:
        return "C-chain"
    if llm and sec:
        return "C"
    if chain_title:
        return "A"
    return ""


def classify_paper(paper: Paper) -> Paper:
    cat = classify_text(paper.title, paper.summary)
    paper.category = cat
    blob = f"{paper.title} {paper.summary}"
    paper.traditional_object = bool(
        cat
        and (
            _has(
                blob,
                (
                    "c/c++",
                    "c++",
                    "java",
                    "python",
                    "android",
                    "firmware",
                    "binary",
                    "busybox",
                    "linux",
                    "kernel",
                    "smart contract",
                    "solidity",
                    "ethereum",
                    "wordpress",
                    "source code",
                    "codeql",
                    "sast",
                    "protocol",
                    "web application",
                ),
            )
            or cat in {"A", "C-chain"}
        )
    )
    if not paper.tags:
        if cat == "A":
            paper.tags = ["blockchain"]
        elif cat == "C-chain":
            paper.tags = ["llm", "blockchain"]
        elif cat == "C":
            paper.tags = ["llm"]
    return paper


def score_paper(paper: Paper) -> float:
    """Higher is better. Used to pick a short daily digest."""
    if not paper.category:
        return -1.0
    score = 0.0
    score += {"C-chain": 8.0, "C": 7.0, "A": 6.0}.get(paper.category, 0.0)
    if paper.traditional_object:
        score += 1.5
    if paper.top_venue:
        score += 1.5
    if paper.venue and paper.venue.lower() not in {"arxiv only", "arxiv", "eprint"}:
        score += 0.8
    title = paper.title
    if _has(title, ("sok", "survey", "systematic")):
        score += 0.3
    if _has(title, TITLE_TASK_TERMS):
        score += 0.8
    if _has(title, ("jailbreak", "privacy", "rag", "misinformation")):
        score -= 3.0
    # Generic APR / testing without vuln language.
    if _has(title, ("program repair", "automated program repair")) and not _has(
        title, TITLE_TASK_TERMS
    ):
        score -= 4.0
    return score


def select_digest(papers: list[Paper], limit: int = 12) -> list[Paper]:
    """宁缺毋滥: mix C/C-chain and A, drop low-signal hits, cap at *limit*."""
    ranked = [p for p in papers if p.category and score_paper(p) >= 6.0]
    cs = [p for p in ranked if p.category in {"C", "C-chain"}]
    a_s = [p for p in ranked if p.category == "A"]
    cs.sort(key=score_paper, reverse=True)
    a_s.sort(key=score_paper, reverse=True)

    c_budget = min(len(cs), max(limit - min(4, len(a_s)), limit // 2))
    if not a_s:
        c_budget = min(len(cs), limit)
    picked: list[Paper] = []
    seen: set[str] = set()

    def take(seq: list[Paper], n: int) -> None:
        for paper in seq:
            if len(picked) >= limit:
                return
            key = paper.paper_id.lower()
            if key in seen:
                continue
            seen.add(key)
            picked.append(paper)
            if sum(1 for x in picked if x.category in {"C", "C-chain"}) >= n and paper.category != "A":
                # n is c_budget only when taking C; ignore for A
                pass

    for paper in cs:
        if len([p for p in picked if p.category in {"C", "C-chain"}]) >= c_budget:
            break
        if paper.paper_id.lower() in seen:
            continue
        seen.add(paper.paper_id.lower())
        picked.append(paper)
        if len(picked) >= limit:
            break
    for paper in a_s:
        if len(picked) >= limit:
            break
        if paper.paper_id.lower() in seen:
            continue
        seen.add(paper.paper_id.lower())
        picked.append(paper)
    return picked
