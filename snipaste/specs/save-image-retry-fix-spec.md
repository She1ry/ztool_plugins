# Snipaste 保存功能再次修复 Spec

## 问题描述

上次修复（v1.0.1）后，用户点击保存按钮，系统对话框弹出并确认后，文件仍未写入磁盘。

## 根因分析

v1.0.1 修复方案使用 preload 脚本 + `fs.writeFileSync` 写文件，但存在两个问题：

### 问题 1：`showSaveDialog` 可能为异步调用

ZTools 的 `showSaveDialog` 类型签名为 `string | undefined`（同步），但实际运行时可能为异步实现（返回 Promise）。若为异步，则 `filePath` 接收到的是 Promise 对象而非字符串路径，导致后续 `fs.writeFileSync` 写入失败。

### 问题 2：preload 脚本未确保目录存在

`fs.writeFileSync` 在目标目录不存在时会直接抛出 `ENOENT` 错误。preload 脚本的 catch 块会捕获并返回 `false`，但用户看到的只是"保存失败"，无法得知具体原因。

### 问题 3：`snipasteSaveImage` 调用未做防护

若 preload 脚本未正确加载（`window.snipasteSaveImage` 为 `undefined`），调用时会抛出 `TypeError`，此错误未被 `saveImage()` 捕获，导致静默失败且无任何通知。

## SPEC-01: 修复 saveImage 函数 — 异步兼容 + 错误处理

**文件:** `src/Screenshot/index.vue`

**改动:**
1. 将 `saveImage` 改为 `async` 函数
2. 对 `showSaveDialog` 返回值做 `await`，兼容同步/异步两种实现
3. 对 `window.snipasteSaveImage` 调用加 try-catch，防止 preload 未加载时崩溃
4. 校验 `filePath` 为有效字符串后再调用写入

## SPEC-02: 修复 preload 脚本 — 确保目录存在

**文件:** `public/preload.js`

**改动:**
1. 使用 `fs.mkdirSync(dir, { recursive: true })` 确保目标目录存在
2. 写入前先解析 `path.dirname(filePath)` 并创建目录
3. 错误时通过 `console.error` 输出详细信息，便于调试

## SPEC-03: 版本号

`1.0.1` → `1.0.2`（bug fix → patch）

## 验收标准

- 点击保存按钮弹出系统保存对话框
- 选择路径并确认后，图片文件实际写入磁盘
- 保存成功后显示"截图已保存"通知
- 保存失败时显示"保存失败"通知
- 取消保存对话框不执行任何操作
- 目标目录不存在时自动创建
- preload 未加载时不崩溃，显示"保存失败"通知
- `npm run build` 通过，`vue-tsc` 无报错
