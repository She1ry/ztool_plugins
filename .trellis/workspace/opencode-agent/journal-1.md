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
