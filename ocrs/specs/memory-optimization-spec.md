# OCR 插件内存优化 Spec

## 问题描述

v1.1.0 更新后，OCR 插件内存占用从 ~200MB 上升至 ~350MB。主要变化来自：
1. `worker: true` 的引入使 ONNX Runtime WASM 在独立 Worker 中运行，Worker 自身维护独立的 WASM 内存堆
2. 图片缩放流程中原始 Blob、Image 对象、Canvas、缩放后 Blob 同时驻留内存
3. Canvas 像素数据未主动释放
4. OCR 实例的 WASM 内存在 dispose 后未完全回收

目标：将峰值内存从 350MB 降至 200MB 以下。

---

## SPEC-01: 图片缩放流程内存优化

**文件:** `src/Ocr/index.vue`

**问题:** `resizeImage()` 执行期间，原始 Blob、Image 对象、Canvas、缩放后 Blob 四者同时驻留内存。对于 4K 截图，原始 Blob 可达 8-15MB，Image 解码后像素数据 ~60MB，Canvas 又占 ~20MB。

**改动:**
1. 缩放完成后显式释放原始 blob 引用（`rawBlob` 变量置 null）
2. 缩放完成后清理 canvas（`canvas.width = 0; canvas.height = 0`）
3. 小图片（宽高均 ≤ MAX_EDGE）时直接返回原始 blob，跳过整个缩放流程（当前代码虽然 resolve 了原始 blob，但仍然创建了 URL 和 Image 对象）
4. 将 `imgBase64` 置 null 的时机提前到 `normalizeScreenshotToBlob` 之后

**验收:**
- 缩放完成后原始 blob 可被 GC
- canvas 像素数据被释放
- 小图片路径零额外内存分配

---

## SPEC-02: base64 → Blob 转换内存优化

**文件:** `src/Ocr/index.vue`

**问题:** `normalizeScreenshotToBlob()` 中，`atob()` 返回的二进制字符串、`Uint8Array`、`bytes.buffer`（ArrayBuffer）、Blob 同时存在。对于 10MB 的 base64 字符串，峰值同时持有：base64 字符串 + 二进制字符串 + Uint8Array + ArrayBuffer + Blob ≈ 5x 原始大小。

**改动:**
1. 在 `normalizeScreenshotToBlob` 返回后，立即将 `imgBase64` 参数置 null（调用方负责）
2. 使用 `fetch('data:...')` API 替代手动 base64 解码（浏览器原生 data URL → Blob 转换，零额外内存拷贝）

**验收:**
- base64 字符串在 Blob 创建后即可被 GC
- 峰值内存从 ~5x 降至 ~2x

---

## SPEC-03: OCR 实例 WASM 内存释放

**文件:** `src/Ocr/ocr-instance.ts`

**问题:** `disposeOcr()` 调用 `ocr.dispose()` 后，ONNX Runtime WASM 的线性内存（通常 100-200MB）可能因 JS 持有引用而无法被 GC。Worker 模式的 Worker 线程本身也占用内存。

**改动:**
1. `disposeOcr()` 中，在 `ocr.dispose()` 后显式触发 GC 建议（通过 `ocr` 变量置 null、清除所有引用）
2. 将 `ocrPromise` 提取为模块级变量改为可完全重置（当前实现已置 undefined，确认无闭包泄漏）
3. 确保 Worker 模式下 terminate worker（PaddleOCR SDK 的 `dispose()` 应包含此逻辑，不额外处理）

**验收:**
- dispose 后 WASM 内存可被 GC
- 再次调用 `getOcr()` 可正常重建实例

---

## SPEC-04: 图片格式优化

**文件:** `src/Ocr/index.vue`

**问题:** `canvas.toBlob()` 默认输出 PNG 格式。PNG 解码后的像素数据量与未压缩位图相同，且 PaddleOCR 内部会将图片转为 RGB 张量，不需要 PNG 的压缩特性。JPEG 格式可以显著减少 Blob 大小。

**改动:**
1. `canvas.toBlob()` 改用 `image/jpeg` 格式，quality 0.85
2. OCR 输入不需要 alpha 通道，JPEG 完全可以满足

**验收:**
- 缩放后 Blob 大小减少 50-70%
- 识别精度无明显下降（JPEG 0.85 对文字识别无影响）

---

## SPEC-05: 内存峰值时序优化

**文件:** `src/Ocr/index.vue`

**问题:** 当前流程中，`imgBase64` 在 `normalizeScreenshotToBlob` 之后才置 null（SPEC-01 要点），但 `resizeImage` 执行期间 `rawBlob` 仍然驻留。

**改动:**
1. 在 `startOcr()` 中，`imgBase64` 在 `normalizeScreenshotToBlob` 调用后立即置 null
2. `resizeImage` 返回后，`rawBlob` 变量置 null
3. OCR predict 返回后，`image` 变量置 null

**验收:**
- 各阶段内存峰值不叠加
- base64 字符串在转换后立即释放
- 原始 Blob 在缩放后立即释放
- 输入 Blob 在 OCR 完成后释放

---

## 改动范围

| 文件 | 涉及 Spec |
|------|-----------|
| `src/Ocr/index.vue` | SPEC-01, 02, 04, 05 |
| `src/Ocr/ocr-instance.ts` | SPEC-03 |
| `package.json` | 版本号 |
| `public/plugin.json` | 版本号 |

## 验收标准

1. `npm run build` 通过，`vue-tsc` 无报错
2. 构建产物包含 `worker-entry-*.js`（Worker 模式正常工作）
3. 功能回归：截图 → 识别 → 复制 全流程正常
4. 版本号更新为 `1.2.0`（性能优化 → minor）

## 不在本次范围内

- 切换回 `worker: false`（Worker 模式对 UI 响应性有益，保留）
- 模型量化 / 更换更小模型（需 SDK 层面支持）
- IndexedDB 缓存（SDK 不支持）
- WebAssembly Memory 的 `initial`/`maximum` 参数调优（ORT WASM 自动管理）
