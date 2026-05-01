# AGENTS.md — OCR 插件

> 通用开发规范见父目录 `../AGENTS.md`。本文件只记录 OCR 插件特有内容。

## 项目结构
- `src/main.ts` → `src/App.vue` → `src/Ocr/index.vue`
- `src/Ocr/api-config.ts` — API 配置类型 + localStorage 持久化
- `src/Ocr/Settings.vue` — API Key / Endpoint 设置页
- `src/Ocr/index.vue` — 截图、远程 API 调用、结果展示
- `specs/` — 改动 spec 文档

## 关键配置
- `public/plugin.json` — 触发关键词：`ocr`、`截图识别`、`文字识别`，`mainHide: true`
- `vite.config.js` — `base: './'`，无特殊 chunk 分割
- OCR: 远程 API（aistudio layout-parsing），用户自定义 endpoint + apiKey

## API 配置
- 存储 key: `ocrs_api_config`（localStorage）
- 默认端点: `https://ibv5fbv9z3i8vd68.aistudio-app.com/layout-parsing`
- 请求格式: POST `{endpoint}`，Header `Authorization: token {apiKey}`
- 响应解析: `result.layoutParsingResults[0].markdown.text`

## ZTools Gotchas
- 截图流程：`mainHide: true` → `hideMainWindow()` → 延迟 → `screenCapture()` → `showMainWindow()`
- `window.ztools.screenCapture(callback)` 返回 base64 图片
- 截图取消时界面展示取消状态，可点击"重新截图"再次识别

## TypeScript/Style
- `strict: false`，`noImplicitAny: false`（历史遗留，新代码应自行严格）
- ZTools API 类型：`@ztools-center/ztools-api-types`
