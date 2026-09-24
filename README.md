# 站点接管副本（原站：https://personal-homepage-12568.app.workbuddy.host/）

这份目录是从 WorkBuddy 线上站**原样抓取**的完整副本，共 10 个文件，无编译步骤、无 npm 依赖，直接就是可运行的源码。

## 本地运行

```
node serve.js
```

打开 http://127.0.0.1:8099/ 即可。根路径会自动跳到 `home3.html`（首页）。

## 页面结构

| 文件 | 标题 | 说明 |
| --- | --- | --- |
| `index.html` | 曼城十号梅西 | 入口页，立即跳转 `home3.html` |
| `home3.html` | 曼城十号梅西 | 首页 / 导航 |
| `work.html` | — | 工作事项（含每日 todo，云端 key `work:<日期>`） |
| `portfolio.html` | — | 持仓看盘，行情走腾讯财经 + 东方财富公开接口 |
| `halfmarathon.html` | — | 半马训练 |
| `deepseek.html` | — | DeepSeek 余额记录（云端 key `deepseek:<日期>`） |
| `wujiang.html` | — | 吴江相关页 |
| `version.json` | — | 各页版本号，页面用它做「有新版自动刷新」 |
| `assets/wb-cloud-v2.js` | — | 云端同步封装（读写 key/value） |
| `assets/workbuddy-cloud-sdk.js` | — | WorkBuddy 官方云 SDK（PostgREST 风格客户端） |

所有样式和业务脚本都内联在 HTML 里，站内没有图片等二进制资源。

## UI 皮肤层（2026-09-25 新增）

全站共用一套「科技感」视觉层，只改外观、不碰业务逻辑：

| 文件 | 作用 |
| --- | --- |
| `assets/tech-ui.css` | 配色 token（浅色页 / 深色页各一套）、蓝图网格 + 极光背景、HUD 顶栏、首页 Hero、卡片/按钮/输入/进度条的霓虹化打磨 |
| `assets/tech-ui.js` | 注入顶部 HUD 导航条（含北京时间、云端状态、滚动进度），首页加实时数据流条、DeepSeek 卡内 7 天余额迷你走势图、半马卡内本周完成度环 |
| `assets/favicon.svg` | 站点图标（渐变「10」） |

接入方式：每个页面 `<head>` 里加一行 `<link rel="stylesheet" href="./assets/tech-ui.css">`，
`</body>` 前加一行 `<script src="./assets/tech-ui.js"></script>`。
浅色页面在 `<html>` 上标 `class="t-light"`，深色页面标 `class="t-dark"`（决定用哪套 token）。
**想还原原样：删掉这两行引用即可**，各页原有样式和功能完全不受影响。

改配色只需要动 `tech-ui.css` 顶部的 token 区（`--t-acc` 主蓝 / `--t-acc-2` 青 / `--t-acc-3` 紫 / `--t-gold` 金）。

## 外部依赖（全站只有两处）

1. **WorkBuddy 云端表格** —— 唯一的「后端」。
   - 实际接口：`GET/POST https://personal-homepage-12568.app.workbuddy.host/.cloud/database/rest/app_state`
   - 认证：请求头 `x-wb-webapp-access-key: wbpk_QJczmdjZF1FclKiSlDwaC9_nOLurRdLh7vbqU5i5BEgbgVYzCDn0SnD`
   - 这是个**公开的 publishable key**，写在 `assets/wb-cloud-v2.js` 里，任何访客都能读写这张表。
2. **行情接口**：`qt.gtimg.cn`（主源）、`push2.eastmoney.com`（备源），公开、无需密钥。

## 已导出的云端数据

`data/app_state.json`，截至 2026-09-24 共 10 条：

| key | 内容 |
| --- | --- |
| `gain:2026-09-22` | 每日收益 `14519` |
| `gain:2026-09-23` | 每日收益 `-9228` |
| `signals:jili` / `hik` / `tencent` / `maotai` / `meituan` | 5 只股票的持仓覆盖值（估值 / 核心仓 / 波段仓） |
| `deepseek:2026-09-23` / `deepseek:2026-09-24` | DeepSeek 余额快照（bal / grt / top / ts） |
| `work:2026-09-24` | 当日 todo 列表（2 项） |

前端本地缓存另用 `localStorage`：`gain-2026-v1`、`portfolio-signals-overrides-v1`、`wbBuild`、`wbHop`。

## 接管后端的两条路

**A. 继续用 WorkBuddy 云（改动为 0）**
页面里的 endpoint + key 不变，换域名部署后云端读写照旧。
风险：这个 key 附属于 WorkBuddy 上那个 app，app 一旦删除/换 key，数据即断；且任何人拿到页面都能改数据。

**B. 换成你自己的存储（真正的接管）**
只需替换 `assets/wb-cloud-v2.js` 一个文件，保持 `WB.data / WB.put / WB.del / WB.onReady` 这套接口不变，其余 5 个页面零改动。可选：
- 纯本机 `localStorage`（最简单，但不再跨设备同步）；
- 自己的后端 + 数据库（推荐，数据主权完全在自己手里）；
- Supabase / Cloudflare KV 等托管数据库。

迁移时把 `data/app_state.json` 的 10 条记录按 `k → v.v` 灌进新存储即可，key 格式不用动。
