const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('snipasteSaveImage', (base64, filePath) => {
  try {
    if (typeof base64 !== 'string' || !base64.startsWith('data:')) {
      return { ok: false, error: '无效的图片数据' }
    }
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return { ok: false, error: '无效的文件路径：' + typeof filePath }
    }
    const normalizedPath = path.normalize(filePath)
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return { ok: false, error: '图片数据格式不正确' }
    }
    const data = matches[2]
    if (!data) {
      return { ok: false, error: '图片数据为空' }
    }
    const buffer = Buffer.from(data, 'base64')
    const dir = path.dirname(normalizedPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(normalizedPath, buffer)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message || '写入失败' }
  }
})
