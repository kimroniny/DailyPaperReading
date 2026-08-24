"""CLI: python -m paper_radar daily|venues"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from paper_radar.pipeline import papers_to_json, parse_years, run_daily, run_venues


def _add_shared(p: argparse.ArgumentParser) -> None:
    p.add_argument("--json-out", type=Path, default=None, help="Write selected papers as JSON")
    p.add_argument("--digest-out", type=Path, default=None, help="Write markdown digest")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="paper_radar",
        description="Daily arXiv/IACR radar and multi-year venue scan (A / C / C-chain).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    daily = sub.add_parser("daily", help="Last N days on arXiv + IACR ePrint")
    daily.add_argument("--days", type=int, default=7)
    daily.add_argument("--max", dest="limit", type=int, default=12)
    daily.add_argument("--memory", type=Path, default=None, help="Seen-id memory file")
    daily.add_argument(
        "--write-memory",
        action="store_true",
        help="Append selected papers to --memory",
    )
    daily.add_argument("--skip-arxiv", action="store_true")
    daily.add_argument("--skip-iacr", action="store_true")
    _add_shared(daily)

    venues = sub.add_parser("venues", help="CCS / journals / USENIX / SE conference lists")
    venues.add_argument("--years", default="2024-2026")
    venues.add_argument(
        "--sources",
        default="ccs,journals,usenix",
        help="Comma list: ccs,journals,usenix,seconf",
    )
    venues.add_argument(
        "--cache-dir",
        type=Path,
        default=None,
        help="Reuse saved Crossref/PDF extracts (ccs25.json, tse.json, sec24_contents.txt, ...)",
    )
    venues.add_argument("--seconf", type=Path, default=None, help="SEConfPaperList papers.md")
    venues.add_argument(
        "--live",
        action="store_true",
        help="Hit Crossref / USENIX even if cache is present (slow)",
    )
    venues.add_argument(
        "--all-json-out",
        type=Path,
        default=None,
        help="Write every classified relevant paper, not only the digest cap",
    )
    _add_shared(venues)

    args = parser.parse_args(argv)

    if args.cmd == "daily":
        result = run_daily(
            days=args.days,
            limit=args.limit,
            memory_path=args.memory,
            write_memory=args.write_memory,
            skip_arxiv=args.skip_arxiv,
            skip_iacr=args.skip_iacr,
        )
        selected = result["selected"]
    else:
        year_from, year_to = parse_years(args.years)
        sources = [s.strip() for s in args.sources.split(",") if s.strip()]
        if args.seconf:
            sources.append("seconf")
        result = run_venues(
            years=(year_from, year_to),
            sources=sources,
            cache_dir=args.cache_dir,
            seconf_path=args.seconf,
            live=args.live,
        )
        selected = result["selected"]
        if args.all_json_out:
            args.all_json_out.write_text(
                json.dumps(
                    papers_to_json(result["all_relevant"]),
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

    digest = result["digest"]
    sys.stdout.write(digest)
    if result.get("errors"):
        sys.stderr.write("errors:\n")
        for err in result["errors"]:
            sys.stderr.write(f"  {err}\n")

    meta = {k: v for k, v in result.items() if k not in {"selected", "digest", "all_relevant"}}
    sys.stderr.write(json.dumps(meta, ensure_ascii=False) + "\n")

    if args.json_out:
        args.json_out.write_text(
            json.dumps(papers_to_json(selected), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    if args.digest_out:
        args.digest_out.write_text(digest, encoding="utf-8")
    return 0
