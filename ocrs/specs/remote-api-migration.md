# Spec: OCR 插件迁移为远程 API

## 问题描述

当前 OCR 插件使用 `@paddleocr/paddleocr-js` 在浏览器端本地执行 OCR 推理，依赖 PP-OCRv5 中文模型 + ONNX Runtime WASM + OpenCV.js。问题：
- 模型体积大，插件包重
- 首次使用需下载模型资源，耗时长
- 本地推理占用浏览器内存和 CPU

目标：替换为远程 API 调用（aistudio layout-parsing API），用户可自定义 API 端点和 API Key。

## 具体改动

### 1. 删除文件
- `src/Ocr/ocr-instance.ts` — PaddleOCR 单例管理，不再需要
- `patches/@paddleocr+paddleocr-js+0.3.2.patch` — 不再需要

### 2. 新增文件
- `src/Ocr/api-config.ts` — API 配置类型定义 + localStorage 读写工具
- `src/Ocr/Settings.vue` — 设置页面组件（API Key、Endpoint 输入）

### 3. 修改文件

#### `package.json`
- 移除 `@paddleocr/paddleocr-js` 依赖
- 移除 `patch-package` 依赖和 `postinstall` 脚本
- version: `1.2.0` → `2.0.0`

#### `public/plugin.json`
- description 改为 "使用远程 API 识别截图中的文字"
- version: `1.2.0` → `2.0.0`

#### `vite.config.js`
- 移除 `onnxruntime-web` alias
- 移除 manualChunks 中的 ort、opencv、paddleocr 分割
- 移除 optimizeDeps 中的排除项

#### `src/Ocr/index.vue`
- 移除 `import type { OcrResult }` 和 `import { getOcr, disposeOcr }`
- 移除 `resizeImage()` 函数（API 直接接受 base64）
- 移除 `normalizeScreenshotToBlob()` 中的 fetch 转换（直接传 base64）
- 移除 `summarizeResult()` 中基于 `OcrResult` 类型的处理
- 替换 `startOcr()` 核心逻辑：
  - 移除 `loading-model` 状态阶段
  - 截图后直接从 base64 构造请求 payload
  - POST 到用户配置的 API endpoint
  - 解析返回的 markdown 文本
- 新增 `recognizing` 状态的进度展示（无中间进度，0% → 100%）
- API 错误分类：认证失败 (401/403)、限流 (429)、网络异常、超时
- 结果展示：markdown 文本直接显示在 textarea
- 添加设置按钮入口（齿轮图标），点击切换到设置页

#### `src/App.vue`
- 移除 `getOcr()`/`disposeOcr()` 调用
- 简化为纯路由，进入即截图

#### `src/main.css`
- 新增设置页样式（表单输入、按钮等）

#### `src/AGENTS.md`
- 更新为远程 API 模式描述

## API 请求格式

参考 aistudio layout-parsing API：
```
POST {endpoint}
Headers: Authorization: token {apiKey}, Content-Type: application/json
Body: {
  file: base64EncodedImage,
  fileType: 1,  // 图片=1, PDF=0
  useDocOrientationClassify: false,
  useDocUnwarping: false,
  useChartRecognition: false
}
```

响应解析：
```ts
interface ApiResponse {
  result: {
    layoutParsingResults: Array<{
      markdown: { text: string; images: Record<string, string> }
    }>
  }
}
```

取 `result.layoutParsingResults[0].markdown.text` 作为识别文本。

## 验收标准

1. `npm run build` 通过，vue-tsc 无报错
2. 插件设置页可配置 API Key 和 Endpoint，配置持久化到 localStorage
3. 未配置 API Key 时，点击识别引导用户先配置
4. 截图后调用远程 API，识别结果显示在文本框
5. API 错误分类正确展示（认证失败、限流、网络、超时）
6. 移除所有 PaddleOCR/ONNX/OpenCV 相关代码和依赖
7. 版本号更新为 2.0.0
