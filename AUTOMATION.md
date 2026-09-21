# Cursor 自动化提示词

把下面整段粘贴到 https://cursor.com/automations/1a763852-9f6b-11f1-a7d1-d6b4613131ce 的 Prompt。仓库选 GitHub：`kimroniny/DailyPaperReading`，分支 `main`。

---

你在 GitHub 仓库 `kimroniny/DailyPaperReading` 上跑每日软件安全论文雷达。目标：把今天筛出的论文写成当天的 JSON，开一个只改 `data/` 的 PR 到 `main`。GitHub Action 会自动合并并发布 Pages。不要改 js、css、html、workflow。

## 筛选（宁缺毋滥）

只收这三类，写入 `topics`：

- **A**：区块链 / Web3 / 协议安全（不要求 LLM）
- **C**：用 LLM / agent / foundation model 做漏洞检测、修复、fuzz、审计、渗透测试
- **C-chain**：C 且对象是链 / 合约 / zk

丢掉：非 LLM 的传统安全（即使顶会）、jailbreak、prompt injection、LLM 隐私、泛化 APR / 普通程序修复、与安全任务无关的 LLM 论文。

## 步骤

1. 今天的日期用 UTC 的 `YYYY-MM-DD`。
2. 若仓库里有 `paper_radar`：
   ```bash
   python3 -m pip install -r requirements.txt
   python3 -m paper_radar daily --days 7 --max 12 --json-out digest.json
   node scripts/write-daily.js digest.json
   ```
   不要把 `digest.json` 提交进仓库。
3. 若没有 `paper_radar`：自己检索最近 7 天 arXiv cs.CR/cs.SE 与 IACR ePrint，按上面规则筛选，最多 12 篇，写成 `data/YYYY-MM-DD.json`，并把该日期插到 `data/manifest.json` 的 `dates` 数组最前面（已存在则移到最前，不要重复）。
4. 当天文件格式：
   ```json
   {
     "date": "YYYY-MM-DD",
     "papers": [
       {
         "id": "string",
         "title": "string",
         "authors": ["string"],
         "year": 2026,
         "venue": "string",
         "abstract": "中文提要，不要整段粘原文摘要",
         "topics": ["A"],
         "aliases": [],
         "url": "https://...",
         "pdf": "https://..."
       }
     ]
   }
   ```
   `topics` 只能是 `A`、`C`、`C-chain`。`id` 里不要用 `/`（IACR 的 `2026/1877` 写成 `2026-1877`）。已在以往 `data/*.json` 里出现过的 `id` 不要再写进今天的文件。
5. 若筛选结果为 0 篇，或全部都已出现过：不要改文件、不要开 PR，短报一句「今日无新论文」即可。
6. 有新文件时：只 `git add data/YYYY-MM-DD.json data/manifest.json`，提交说明 `Add daily papers YYYY-MM-DD`，向 `main` 开 PR。标题用 `Add daily papers YYYY-MM-DD`。不要标 draft。不要自己 merge（Action `Automerge daily papers` 会处理）。
7. 不要推到 Origin。不要改前端代码。

---
