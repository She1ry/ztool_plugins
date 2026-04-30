# 截图贴图

一个使用 **Vue 3 + Vite + TypeScript** 构建的轻量化 ZTools 插件，包含截图和屏幕取色两个功能模块。

## 功能

### 截图贴图

通过 `截图`、`截图贴图`、`snipaste` 启动。

- 自动隐藏主窗口并进入截图，避免截到插件自身
- 截图完成后在底部快捷栏提供：
  - **保存** — 弹出保存对话框，支持 PNG / JPEG
  - **批注** — 在图片底部添加文字标注
  - **裁剪** — 鼠标拖拽选择区域进行裁剪
  - **复制** — 复制图片到剪贴板
  - **重截** — 重新截图
- 截图页面可一键跳转到取色功能

### 屏幕取色

通过 `取色`、`屏幕取色`、`colorpicker`、`color pick` 启动。

- 自动隐藏主窗口，取色后显示结果
- 大色块预览 + HEX / RGB 值展示
- 支持分别复制 HEX 或 RGB 值
- 取色页面可一键跳转到截图功能

## 使用方式

在 ZTools 主输入框中输入以下关键词触发对应功能：

- `截图` / `截图贴图` / `snipaste` — 进入截图
- `取色` / `屏幕取色` / `colorpicker` — 进入取色

两个功能模块之间也可以通过界面内的按钮互相跳转。

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

## 版本管理

更新版本号时，使用 `npm version` 命令，会自动同步到 `plugin.json` 并 git commit + 打 tag：

```bash
npm version patch   # 修复 bug：1.0.0 → 1.0.1
npm version minor   # 新增功能：1.0.0 → 1.1.0
npm version major   # 破坏性变更：1.0.0 → 2.0.0
```

执行后会：
1. 更新 `package.json` 版本号
2. 自动同步版本号到 `public/plugin.json`
3. git commit（包含 `package.json` + `plugin.json`）
4. 打 tag（如 `v1.0.1`）

## 项目结构

```text
.
├── public/
│   ├── logo.png
│   └── plugin.json          # ZTools 插件清单（版本号与 package.json 同步）
├── scripts/
│   └── sync-version.js      # 版本号同步脚本
├── src/
│   ├── Screenshot/
│   │   └── index.vue        # 截图模块
│   ├── ColorPicker/
│   │   └── index.vue        # 取色模块
│   ├── App.vue              # 路由入口，根据 feature.code 切换模块
│   ├── env.d.ts             # 类型声明
│   ├── main.css             # 全局样式
│   └── main.ts              # 应用入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

## 实现说明

- 截图使用 `window.ztools.screenCapture(callback)`，返回 base64 图片
- 取色使用 `window.ztools.screenColorPick(callback)`，返回 `{ hex, rgb }`
- 主窗口隐藏使用 `mainHide: true` + `window.ztools.hideMainWindow()`，操作完成后调用 `window.ztools.showMainWindow()` 恢复
- 模块间跳转使用 `window.ztools.redirect(code, payload)`
- 复制到剪贴板使用 `window.ztools.copyImage()` / `window.ztools.copyText()`
- 批注功能通过 Canvas 在图片底部绘制文字实现
- 裁剪功能通过 Canvas 截取选中区域实现
