# 截图 OCR 识别

这是一个使用 **Vue 3 + Vite + TypeScript** 构建的 ZTools 插件。插件会在进入功能后自动打开截图，截图完成后使用 `@paddleocr/paddleocr-js` 在浏览器端执行中文 OCR 识别，并展示可复制的识别文本。

## 功能

- 通过 `ocr`、`截图识别`、`文字识别` 启动插件。
- 自动隐藏主窗口并进入截图，避免截到插件自身。
- 使用 PaddleOCR.js `PP-OCRv5` 中文模型在本地前端环境识别文字。
- 展示识别文本、文本块数量、平均置信度和识别耗时。
- 支持复制识别文本和重新截图。

## 使用方式

1. 在 ZTools 中输入 `截图识别`、`文字识别` 或 `ocr`。
2. 选择需要识别的屏幕区域。
3. 等待 OCR 模型加载和识别完成。
4. 在结果页查看或复制识别文本。

首次识别需要加载 PaddleOCR 模型和 ONNX Runtime Web 资源，可能耗时较长并需要联网。后续可改为自托管模型资源以减少网络依赖。

## 开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`，ZTools 会通过 `public/plugin.json` 中的 `development.main` 加载开发版本。

构建生产版本：

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 项目结构

```text
.
├── public/
│   ├── logo.png
│   ├── plugin.json
│   └── preload/
│       └── services.js
├── src/
│   ├── Ocr/
│   │   └── index.vue
│   ├── App.vue
│   ├── env.d.ts
│   ├── main.css
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

## 实现说明

- 截图能力使用 ZTools 类型定义中确认的 `window.ztools.screenCapture(callback)`，返回值按 base64 图片处理。
- 主窗口隐藏使用 `mainHide: true` 和 `window.ztools.hideMainWindow()` 双重处理，截图回调后调用 `window.ztools.showMainWindow()` 展示结果。
- OCR SDK 使用 `PaddleOCR.create({ worker: true, lang: 'ch', ocrVersion: 'PP-OCRv5', ortOptions: { backend: 'wasm' } })`。
- OCR 实例通过模块级 Promise 缓存，避免每次重新进入功能都重复初始化模型。
- 复制结果使用 `window.ztools.copyText()`，复制后通过 `window.ztools.showNotification()` 提示。

## 注意事项

- 项目使用 `patch-package` 移除了 PaddleOCR.js 对 `file://` 来源的硬性拦截，因为 ZTools 生产插件通常从本地文件加载。安装依赖后 `postinstall` 会自动应用 `patches/@paddleocr+paddleocr-js+0.3.2.patch`。
- PaddleOCR.js worker/wasm 资源在不同 ZTools 运行环境中可能受路径或网络策略影响；如构建后资源 404，可配置明确的 `wasmPaths` 或改为自托管资源。
- 截图取消时界面会展示取消状态，可点击“重新截图”再次识别。
- 当前 OCR 仅在前端执行，不依赖 preload 中的 Node.js 文件读写服务。
