# ztool-plugins

ZTools 插件集合，每个子目录是一个独立插件。

## 插件列表

| 插件 | 说明 | 触发关键词 |
|---|---|---|
| [snipaste](./snipaste/) | 截图贴图 — 截图后保存、批注、裁剪、复制，以及屏幕取色 | `截图` `截图贴图` `snipaste` `取色` `屏幕取色` `colorpicker` |
| [ocrs](./ocrs/) | 截图 OCR 识别 — 使用 PaddleOCR.js 识别截图中的中文文字 | `ocr` `截图识别` `文字识别` |

## 开发

每个插件是独立项目，进入对应目录执行：

```bash
cd <plugin-name>
npm install
npm run dev    # 开发模式，ZTools 会从 localhost:5173 加载
npm run build  # 构建生产版本，输出到 dist/
```

## 添加新插件

1. 在根目录创建新插件目录
2. 参照现有插件结构：`public/plugin.json` + `src/` + `package.json`
3. 确保 `plugin.json` 中 `name` 唯一
