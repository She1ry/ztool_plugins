import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, join } from 'path'
import { existsSync, unlinkSync, readdirSync } from 'fs'

function removeUnusedAssets() {
  return {
    name: 'remove-unused-assets',
    closeBundle() {
      const assetsDir = join(__dirname, 'dist', 'assets')
      if (!existsSync(assetsDir)) return
      for (const file of readdirSync(assetsDir)) {
        if (file.startsWith('worker-entry-')) {
          unlinkSync(join(assetsDir, file))
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), removeUnusedAssets()],
  base: './',
  resolve: {
    alias: {
      'onnxruntime-web': resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs')
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('onnxruntime-web')) return 'ort'
          if (id.includes('@techstark/opencv-js')) return 'opencv'
          if (id.includes('@paddleocr/paddleocr-js')) return 'paddleocr'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', '@paddleocr/paddleocr-js', '@techstark/opencv-js']
  }
})
