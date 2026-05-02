# Journal - opencode-agent (Part 1)

> AI development session journal
> Started: 2026-05-01

---



## Session 1: refactor(ocrs): extract shared CSS, fix timer leak, add URL validation

**Date**: 2026-05-01
**Task**: refactor(ocrs): extract shared CSS, fix timer leak, add URL validation
**Branch**: `main`

### Summary

重构 OCR 插件：抽取公共 CSS、修复 timer 泄漏、添加 URL 校验、错误分类改为查找表、移除重复代码。版本 2.0.0 → 2.0.1

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f6fe82a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: OCR插件UI重设计

**Date**: 2026-05-01
**Task**: OCR插件UI重设计
**Branch**: `main`

### Summary

重新设计OCR插件UI：将重新截图和复制文本按钮移至顶部header作为小图标，textarea自适应填充剩余空间，收紧间距和空白

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4f626e2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: MinerU PDF 解析插件开发

**Date**: 2026-05-02
**Task**: MinerU PDF 解析插件开发
**Branch**: `main`

### Summary

新建 mineru 插件：上传 PDF 调用远程接口解析为 Markdown，支持复制和保存到本地，API 层抽象便于切换供应商，API Key 可配置，UI 友好含拖拽支持、进度条、深色模式。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `335ebc3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: fix(mineru): preload PRELOAD_NOT_AVAILABLE

**Date**: 2026-05-02
**Task**: fix(mineru): preload PRELOAD_NOT_AVAILABLE
**Branch**: `main`

### Summary

修复 mineru 插件 preload.js 使用 contextBridge.exposeInMainWorld() 导致渲染进程无法访问 window.mineruSaveFile 的问题。ZTools preload 环境不支持 contextBridge，改为直接 window 赋值。版本 1.0.0 → 1.0.1

### Main Changes

- `mineru/public/preload.js`: 移除 `contextBridge` 导入和调用，改为 `window.mineruSaveFile = {...}`
- `mineru/dist/preload.js`: 同步构建产物
- 版本号 1.0.0 → 1.0.1

### Git Commits

| Hash | Message |
|------|---------|
| `dd428b0` | fix(mineru): replace contextBridge with direct window assignment in preload |

### Testing

- [OK] `vue-tsc && vite build` 通过

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: fix(mineru): rewrite API layer for MinerU precision API

**Date**: 2026-05-02
**Task**: fix(mineru): rewrite API layer — HTTP_405/404 errors due to wrong API call pattern
**Branch**: `main`

### Summary

原代码直接用 base64 POST 到端点，但 MinerU 精准解析 API 不支持直接上传文件。改为标准流程：file-urls/batch 获取 OSS 上传链接 → PUT 上传 → 轮询 batch 结果 → 下载 zip → 提取 markdown。版本 1.0.1 → 1.0.2

### Main Changes

- `mineru/src/MinerU/api-config.ts`: 完全重写，实现 OSS 上传 + 轮询 + zip 解压流程
- `mineru/src/MinerU/index.vue`: 改为传 fileBuffer 而非 base64，增加进度回调
- `mineru/public/preload.js`: 新增 `readFileBuffer()` 方法
- `mineru/src/MinerU/preload.d.ts`: 增加 `readFileBuffer` 类型声明
- 新增依赖 `jszip` 用于解压 API 返回的 zip 包

### Git Commits

| Hash | Message |
|------|---------|
| `df61043` | fix(mineru): rewrite API layer for MinerU precision API |
| `8d0e2d1` | chore(mineru): bump version to 1.0.2 |

### Testing

- [OK] `vue-tsc && vite build` 通过

### Status

[OK] **Completed**

### Next Steps

- 用户需配置正确的 API Key 和端点（默认 `https://mineru.net/api/v4`）
