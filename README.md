# DailyPaperReading

用卡片浏览 **A / C / C-chain** 软件与区块链安全论文（宁缺毋滥）。附带可复用的 **paper radar**：日报扫 arXiv + IACR ePrint；venue 扫 CCS、TSE/TOSEM/EMSE、USENIX Security，以及可选的 SE 会议 markdown。

- GitHub：https://github.com/kimroniny/DailyPaperReading
- 在线阅读：https://kimroniny.github.io/DailyPaperReading/

Filters (宁缺毋滥):

- **A** — blockchain / Web3 / protocol security (LLM not required)
- **C** — LLM / agent / foundation model for vuln detection, repair, fuzz, audit, testing; traditional SE/security objects preferred
- **C-chain** — C whose object is a chain / contract / zk system
- Drop non-LLM traditional security even from top venues; drop jailbreaks / LLM-privacy / generic APR

论文按天存放：`data/YYYY-MM-DD.json`，清单在 `data/manifest.json`。前端启动时读清单，再加载每一天的文件，按 `id` 去重（新的一天优先）。

## 日报怎么进站点

Cursor 自动化应绑 **GitHub 仓库** `kimroniny/DailyPaperReading`，完整提示词见 [AUTOMATION.md](AUTOMATION.md)。每天等价于：

```bash
python3 -m paper_radar daily --days 7 --max 12 --json-out digest.json
node scripts/write-daily.js digest.json
```

只改 `data/` 后开 PR 到 `main`。GitHub Action `Automerge daily papers` 会把**只动** `data/manifest.json` 和 `data/YYYY-MM-DD.json` 的 PR 自动 squash 进 `main`；随后 `Deploy GitHub Pages` 发布。

仓库 **Settings → General → Pull Requests** 打开 **Allow auto-merge**（若 GitHub 要求）。不要给 `main` 加「必须人工审批」，否则机器人合并不了。

## 本地打开

```bash
npm start
```

浏览器访问 `http://localhost:4173`（不要直接用 `file://`，否则读不到 JSON）。

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
  --digest-out digest.md --slack-out slack.txt --json-out digest.json
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

## 测试

```bash
npm test
python3 -m unittest discover -s tests -v
```
