# DailyPaperReading

用卡片浏览论文：检索题目 / 作者 / 摘要，按主题和年份筛选，点开卡片阅读提要。

- GitHub：https://github.com/kimroniny/DailyPaperReading
- 在线阅读：https://kimroniny.github.io/DailyPaperReading/

推到 `main` 后，GitHub Actions 会发布静态页。若站点 404，打开 [Settings → Pages](https://github.com/kimroniny/DailyPaperReading/settings/pages)，Source 选 **GitHub Actions**，再到 [Actions](https://github.com/kimroniny/DailyPaperReading/actions) 里把失败的 `Deploy GitHub Pages` 点 **Re-run jobs**。

## 本地打开

直接打开 `index.html`，或在仓库根目录启动静态服务：

```bash
npm start
```

浏览器访问 `http://localhost:4173`。

## 测试

```bash
npm test
```
