# DailyPaperReading

用卡片浏览 **A / C / C-chain** 软件与区块链安全论文（宁缺毋滥）。

- GitHub：https://github.com/kimroniny/DailyPaperReading
- 在线阅读：https://kimroniny.github.io/DailyPaperReading/

论文按天存放：`data/YYYY-MM-DD.json`，清单在 `data/manifest.json`。前端启动时读清单，再加载每一天的文件，按 `id` 去重（新的一天优先）。

## 日报怎么进站点

Cursor 自动化应绑 **GitHub 仓库** `kimroniny/DailyPaperReading`。提示词见 [AUTOMATION.md](AUTOMATION.md)：按雷达规则自行检索 arXiv / IACR / 会议与期刊列表，写成当天 JSON，开只改 `data/` 的 PR。不要发 Slack。

GitHub Action `Automerge daily papers` 会把**只动** `data/manifest.json` 和 `data/YYYY-MM-DD.json` 的 PR 自动 squash 进 `main`；随后 `Deploy GitHub Pages` 发布。

仓库 **Settings → General → Pull Requests** 打开 **Allow auto-merge**（若 GitHub 要求）。不要给 `main` 加「必须人工审批」，否则机器人合并不了。

## 本地打开

```bash
npm start
```

浏览器访问 `http://localhost:4173`（不要直接用 `file://`，否则读不到 JSON）。

## 测试

```bash
npm test
```
