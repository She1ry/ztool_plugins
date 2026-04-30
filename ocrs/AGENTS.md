# AGENTS.md — OCR 插件

> 通用开发规范见父目录 `../AGENTS.md`。本文件只记录 OCR 插件特有内容。

## 项目结构
- `src/main.ts` → `src/App.vue` → `src/Ocr/index.vue`
- `src/Ocr/ocr-instance.ts` 管理 OCR 实例生命周期（getOcr / disposeOcr）
- `src/Ocr/index.vue` — 截图、缩放、识别、结果展示
- `specs/` — 改动 spec 文档

## 关键配置
- `public/plugin.json` — 触发关键词：`ocr`、`截图识别`、`文字识别`，`mainHide: true`
- `vite.config.js` — `base: './'`，manualChunks 分割 opencv/ort/paddleocr
- OCR: PP-OCRv5 中文，ONNX Runtime WASM，worker 模式

## ZTools/OCR Gotchas
- 截图流程：`mainHide: true` → `hideMainWindow()` → 延迟 → `screenCapture()` → `showMainWindow()`
- `window.ztools.screenCapture(callback)` 返回 base64 图片
- `patches/@paddleocr+paddleocr-js+0.3.2.patch` 移除了 `file://` 来源限制
- 首次使用需联网下载模型资源；如 404 可配置 `wasmPaths` 或自托管

## TypeScript/Style
- `strict: false`，`noImplicitAny: false`（历史遗留，新代码应自行严格）
- ZTools API 类型：`@ztools-center/ztools-api-types`
