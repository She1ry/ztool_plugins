# OCR 插件优化 Spec

## 目标
从性能、内存占用、易用性三个维度优化 OCR 插件。

---

## SPEC-01: 修复 Worker 模式

**问题:** 代码中 `worker: false`，且构建脚本删除了 worker 文件，导致所有 OCR 推理阻塞主线程。AGENTS.md 记录的是 `worker: true`，文档与代码不一致。

**改动:**
1. `src/Ocr/index.vue` — `PaddleOCR.create()` 中 `worker: false` 改为 `worker: true`
2. `vite.config.js` — 移除 `removeUnusedAssets` 插件（它删除了 `worker-entry-*.js`）
3. `AGENTS.md` / `README.md` — 同步更新文档

**验收:**
- OCR 推理在 Web Worker 中执行，主线程不卡顿
- 构建产物包含 `worker-entry-*.js`
- 文档与代码一致

---

## SPEC-02: 图片预处理 — 缩放大尺寸截图

**问题:** 截图直接传给 OCR，4K 屏幕分辨率下图片过大，推理时间长。PP-OCRv5 模型不需要原始分辨率。

**改动:**
1. `src/Ocr/index.vue` — 在 `normalizeScreenshotToBlob()` 之后、`ocr.predict()` 之前，增加图片缩放步骤
2. 缩放逻辑：最长边限制为 1280px，保持宽高比
3. 使用 Canvas 进行缩放（浏览器原生 API，无需额外依赖）

**验收:**
- 大于 1280px 的截图被自动缩放
- 推理时间减少 50%+
- 识别精度无明显下降

---

## SPEC-03: base64 → Blob 转换优化

**问题:** `normalizeScreenshotToBlob()` 使用 `atob()` + 逐字节 `charCodeAt` 循环，大图片时阻塞主线程，且同时持有 base64 字符串 + 二进制字符串 + Uint8Array + Blob 四份内存拷贝。

**改动:**
1. `src/Ocr/index.vue` — 重写 `normalizeScreenshotToBlob()`：
   - 使用 `Uint8Array.from(atob(data), c => c.charCodeAt(0))` 替代手动循环
   - 使用 `new Blob([bytes.buffer], { type: mime })` 避免额外拷贝
2. OCR 完成后，显式释放 `imgBase64` 引用

**验收:**
- 转换速度提升
- 峰值内存从 4x 降至 ~2x

---

## SPEC-04: 模型预加载

**问题:** 用户触发截图后才开始加载模型，首次使用等待时间过长。

**改动:**
1. `src/App.vue` — 在 `onPluginEnter` 回调中，进入 `ocr` 路由时即调用 `getOcr()` 预热模型
2. `src/Ocr/index.vue` — 提取 `getOcr()` 为独立导出函数，供 `App.vue` 调用

**验收:**
- 用户截图时模型已加载或正在加载中
- 首次 OCR 等待时间显著缩短

---

## SPEC-05: 内存管理与 dispose 生命周期

**问题:** OCR 实例 + 模型权重常驻内存，即使插件退出也不释放。

**改动:**
1. `src/Ocr/index.vue` — 增加 `disposeOcr()` 函数，调用 `ocr.dispose()` 并清空 `ocrPromise`
2. `src/App.vue` — 在 `onPluginOut` 回调中调用 `disposeOcr()`

**验收:**
- 插件退出后 OCR 实例被释放
- 内存占用回落

---

## SPEC-06: 错误处理增强

**问题:** 所有错误一个 catch，无重试、无超时、无分类。

**改动:**
1. `src/Ocr/index.vue` — 拆分错误处理：
   - 网络错误（模型下载失败）→ 提示"网络异常，请检查网络后重试"
   - 识别错误 → 提示"识别失败，请重新截图"
   - 取消截图 → 保持当前状态，不进入 error
2. 为 `ocr.predict()` 增加 60s 超时（使用 `AbortController` 或 `Promise.race`）
3. `getOcr()` 缓存失败时自动重置，允许下次重试

**验收:**
- 不同错误类型展示不同提示
- 超时后正确报错
- 失败后再次点击可正常重试

---

## SPEC-07: 用户体验 — 进度反馈与取消状态

**问题:** 模型加载阶段只有静态文字，无实际进度；取消截图后状态指示不明确。

**改动:**
1. `src/Ocr/index.vue` — 增加 `progress` 数值状态（0-100），在模型加载阶段更新
2. 增加 `cancelled` 状态，区分取消和错误
3. 进度条从 indeterminate 改为 determinate（有具体百分比时使用）

**验收:**
- 模型加载阶段显示进度
- 取消截图后界面回到 idle 状态
- 进度条在有进度信息时显示具体进度

---

## 改动范围

| 文件 | 涉及 Spec |
|------|-----------|
| `src/Ocr/index.vue` | SPEC-01, 02, 03, 04, 05, 06, 07 |
| `src/App.vue` | SPEC-04, 05 |
| `vite.config.js` | SPEC-01 |
| `README.md` | SPEC-01 |
| `AGENTS.md` | SPEC-01 |

## 不在本次范围内

- 移除 OpenCV.js 依赖（PaddleOCR 内部依赖，不改动第三方库）
- 语言切换（需模型层面支持）
- 结果高亮/边界框展示（需 canvas 叠加层，改动较大）
- IndexedDB 模型缓存（PaddleOCR SDK 层面不支持，需提 issue）
- 批量截图识别
