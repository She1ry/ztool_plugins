# AGENTS.md — ZTools 插件开发规范

适用于 `ztool_plugins/` 下所有插件。每个插件子目录可有自己的 `AGENTS.md`，记录插件特有的细节。

---

## ⚠️ 开发规范（每次开发必须遵守）

### 1. 先写 Spec，再开发
- 所有改动必须先在 `specs/` 目录下编写 spec 文档。
- 一个 spec 文件涵盖一次改动的所有点。
- Spec 包含：问题描述、具体改动（文件+函数级别）、验收标准。

### 2. 版本号管理
- 每次改动必须更新 `package.json` 和 `public/plugin.json` 中的 `version` 字段，保持一致。
- 遵循语义化版本：bug fix → patch，新功能/优化 → minor，breaking change → major。

### 3. 构建验证
- 改动后必须 `npm run build`，确认 `vue-tsc` 无报错。
- Build 后确认关键产物存在。
- **不需要同步到其他目录**，只在本插件目录下开发。

### 4. Git 提交
- 使用 conventional commits 格式：`type(scope): description`。
- type: `feat` / `fix` / `perf` / `refactor` / `docs` / `chore`。
- scope 为插件目录名（如 `ocrs`、`snipaste`）。
- 提交信息 body 列出所有改动点。

### 5. 代码风格
- 不在代码中写注释，除非逻辑确实复杂到无法自解释。
- 禁止使用 `any` 类型，必须定义明确类型。
- 错误处理要分类，不把所有错误混在一个 catch 里。
- 资源（Blob、base64、URL）用完即释放。

### 6. 通用项目约定
- `dist/` 是构建产物，不作为源码编辑。
- `public/plugin.json` 是插件入口配置，ZTools 从此读取元数据。
- Vue 文件使用 `<script setup lang="ts">`。
- 使用 `package-lock.json`，不用 pnpm/yarn。
