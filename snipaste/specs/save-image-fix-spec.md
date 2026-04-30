# Snipaste 保存功能修复 Spec

## 问题描述

用户点击工具栏"保存"按钮后，系统文件保存对话框正常弹出，用户选择路径并点击"确认保存"后，图片并未写入磁盘。

## 根因分析

`src/Screenshot/index.vue` 中 `saveImage()` 函数调用了 `window.ztools.showSaveDialog()`，但完全忽略了其返回值。

`showSaveDialog` 的类型签名为：
```typescript
showSaveDialog(options: { ... }): (string) | (undefined);
```

它只负责弹出系统对话框并返回用户选择的文件路径（字符串），或 `undefined`（用户取消）。它本身不执行任何文件写入操作。

### 为什么不能直接用 renderer API 写文件

ZTools 插件运行在 Electron WebView 沙箱中，renderer 进程没有 `fs` 模块、没有 Node.js 文件写入 API。所有 ZTools 提供的 API（`showSaveDialog`、`zbrowser.download` 等）都不执行实际文件写入。

### 正确方案：preload 脚本

ZTools 支持 `plugin.json` 中的 `preload` 字段。preload 脚本运行在 Node.js 上下文中，可以 `require('fs')`、`require('electron')`，并通过 `contextBridge` 向 renderer 暴露安全的 API。

## SPEC-01: 创建 preload 脚本提供文件写入能力

**新增文件:** `public/preload.js`

**内容:**
1. `require('electron').contextBridge.exposeInMainWorld` 暴露 `window.snipasteSaveImage`
2. `require('fs').writeFileSync` 将 base64 解码为 Buffer 后写入用户选择的路径
3. 返回 `boolean` 表示成功/失败

## SPEC-02: 修复 saveImage 函数

**文件:** `src/Screenshot/index.vue`

**改动:**
1. 接收 `showSaveDialog` 返回的文件路径
2. 用户取消时（`undefined`）直接 return
3. 调用 `window.snipasteSaveImage(base64, filePath)` 写入文件
4. 根据返回值显示成功/失败通知

## SPEC-03: 注册 preload + 类型声明

**文件:** `public/plugin.json`
- 添加 `"preload": "preload.js"` 字段

**文件:** `src/env.d.ts`
- 声明 `Window` 接口扩展，添加 `snipasteSaveImage` 类型

## 验收标准

- 点击保存按钮弹出系统保存对话框
- 选择路径并确认后，图片文件实际写入磁盘
- 保存成功后显示"截图已保存"通知
- 保存失败时显示"保存失败"通知
- 取消保存对话框不执行任何操作
- `npm run build` 通过，`vue-tsc` 无报错
- `dist/preload.js` 存在

## 改动范围

| 文件 | 涉及 Spec |
|------|-----------|
| `public/preload.js` (新增) | SPEC-01 |
| `src/Screenshot/index.vue` | SPEC-02 |
| `public/plugin.json` | SPEC-03 |
| `src/env.d.ts` | SPEC-03 |
| `package.json` | 版本号 |

## 版本号

`1.0.0` → `1.0.1`（bug fix → patch）

## 不在本次范围内

- 保存格式选择（当前默认 PNG）
- 批量保存
- 自动保存到默认路径
- 文件已存在时的覆盖确认
