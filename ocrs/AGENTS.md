# AGENTS.md

## Project Shape
- Single-package npm app: Vue 3 + Vite + TypeScript for a ZTools plugin.
- Runtime entry flow is `src/main.ts` -> `src/App.vue` -> `src/Ocr/index.vue`; `App.vue` only renders the `ocr` route from `window.ztools.onPluginEnter`.
- `public/plugin.json` is the ZTools source of truth for plugin metadata, preload, and commands: `ocr`, `截图识别`, `文字识别`.
- `src/Hello`, `src/Read`, and `src/Write` are leftover samples; they are not wired by `App.vue` or `public/plugin.json`.
- `dist/` is build output; do not edit it as source.

## Commands
- Install with `npm install`; this repo uses `package-lock.json`, not pnpm/yarn.
- `npm install` runs `postinstall: patch-package`; keep `patches/@paddleocr+paddleocr-js+0.3.2.patch` aligned with `@paddleocr/paddleocr-js` changes.
- Dev server: `npm run dev`; ZTools loads it from `public/plugin.json` `development.main` at `http://localhost:5173`.
- Verification/build: `npm run build`; this runs `vue-tsc && vite build` and writes `dist/`.
- There are no configured lint, format, or test scripts.

## ZTools/OCR Gotchas
- Keep `vite.config.js` `base: './'`; production ZTools loads the built app from local files.
- Screenshot flow depends on `mainHide: true`, `window.ztools.hideMainWindow()`, a short delay, `window.ztools.screenCapture(callback)`, then `window.ztools.showMainWindow()` before displaying results.
- `src/Ocr/index.vue` caches a module-level `PaddleOCR.create(...)` promise; do not recreate the model for each screenshot.
- OCR is configured for Chinese `PP-OCRv5`, ONNX Runtime Web `wasm` backend, and `worker: true`.
- The patch-package patch removes PaddleOCR.js' `file://` origin guard for local-file ZTools production loads.
- First OCR use may download model/wasm assets; if built ZTools usage 404s, configure explicit `wasmPaths` or self-host model resources.
- `public/preload/services.js` injects Node-backed `window.services`, but the current OCR path does not use it.

## TypeScript/Style
- ZTools APIs are typed through `@ztools-center/ztools-api-types` in `tsconfig.json` and `src/env.d.ts`.
- `tsconfig.json` has `strict: false` and `noImplicitAny: false`; do not rely on strict-mode checks to catch unsafe changes.
- Vue files use `<script setup lang="ts">`; keep feature styles scoped unless intentionally changing globals in `src/main.css`.
