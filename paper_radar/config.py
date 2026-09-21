"""Venue names, ISSNs, and official listing URLs."""

from __future__ import annotations

CCS_CONTAINER = (
    "Proceedings of the {year} ACM SIGSAC Conference on Computer and Communications Security"
)

JOURNAL_ISSN = {
    "TSE": "0098-5589",
    "TOSEM": "1049-331X",
    "EMSE": "1382-3256",
}

USENIX_SESSIONS = {
    2026: "https://www.usenix.org/conference/usenixsecurity26/technical-sessions",
    2025: "https://www.usenix.org/conference/usenixsecurity25/technical-sessions",
    2024: "https://www.usenix.org/conference/usenixsecurity24/technical-sessions",
}

USENIX_CONTENTS_PDF = {
    2024: "https://www.usenix.org/sites/default/files/sec24_contents.pdf",
    2025: "https://www.usenix.org/sites/default/files/sec25_contents.pdf",
    2026: "https://www.usenix.org/sites/default/files/sec26_contents.pdf",
}

SP_CONTAINER_HINTS = (
    "{year} IEEE Symposium on Security and Privacy (SP)",
    "IEEE Symposium on Security and Privacy",
)

NDSS_CONTAINER_HINTS = (
    "Proceedings {year} Network and Distributed System Security Symposium",
    "Network and Distributed System Security Symposium",
)

NDSS_ACCEPTED = {
    2024: "https://www.ndss-symposium.org/ndss2024/accepted-papers/",
    2025: "https://www.ndss-symposium.org/ndss2025/accepted-papers/",
    2026: "https://www.ndss-symposium.org/ndss2026/accepted-papers/",
}

SP_PROGRAM = {
    2024: "https://www.ieee-security.org/TC/SP2024/program-papers.html",
    2025: "https://www.ieee-security.org/TC/SP2025/program-papers.html",
    2026: "https://www.ieee-security.org/TC/SP2026/program-papers.html",
}

ARXIV_CATS_DEFAULT = ("cs.CR", "cs.SE")
ARXIV_EXTRA_QUERY = (
    'all:"smart contract" OR all:blockchain OR all:vulnerability OR all:fuzzing '
    'OR all:"large language model" OR all:LLM'
)
