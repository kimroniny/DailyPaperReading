# DailyPaperReading

Reusable **paper radar** for software / blockchain security. Daily job: last N days on arXiv + IACR ePrint. Venue job: CCS, TSE/TOSEM/EMSE, USENIX Security, optional SE conference markdown.

Filters (宁缺毋滥):

- **A** — blockchain / Web3 / protocol security (LLM not required)
- **C** — LLM / agent / foundation model for vuln detection, repair, fuzz, audit, testing; traditional SE/security objects preferred
- **C-chain** — C whose object is a chain / contract / zk system
- Drop non-LLM traditional security even from top venues; drop jailbreaks / LLM-privacy / generic APR

## Setup

```bash
python3 -m pip install -r requirements.txt
```

`pypdf` is only needed to parse USENIX contents PDFs.

## Daily scan (call this each morning)

```bash
python3 -m paper_radar daily --days 7 --max 12
```

Dedup against an append-only memory file:

```bash
python3 -m paper_radar daily --days 7 --memory memories.md --write-memory \
  --digest-out digest.md --json-out digest.json
```

Memory line format: `YYYY-MM-DD | source | id | venue | title`

## Multi-year venue scan

Reuse a cache directory of Crossref dumps (`ccs25.json`, `tse.json`, …) and USENIX text extracts (`sec24_contents.txt`):

```bash
python3 -m paper_radar venues --years 2024-2026 --cache-dir /path/to/cache
```

Live Crossref / USENIX (slow; CCS container queries **must** stop after a page that adds 0 exact matches):

```bash
python3 -m paper_radar venues --years 2024-2026 --live --sources ccs,journals,usenix
```

SE conferences from [iCSawyer/SEConfPaperList](https://github.com/iCSawyer/SEConfPaperList) `papers.md`:

```bash
python3 -m paper_radar venues --years 2024-2026 --seconf papers.md --sources seconf
```

## Library

```python
from paper_radar import run_daily, run_venues

daily = run_daily(days=7, limit=12)
print(daily["digest"])
```

## Tests

```bash
python3 -m unittest discover -s tests -v
```
