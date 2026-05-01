const fs = require('fs')
const path = require('path')

window.snipasteSaveImage = function (base64, filePath) {
  try {
    if (typeof base64 !== 'string' || !base64.startsWith('data:')) {
      return { ok: false, error: 'invalid image data' }
    }
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return { ok: false, error: 'invalid file path: ' + typeof filePath }
    }
    const normalizedPath = path.normalize(filePath)
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return { ok: false, error: 'image data format error' }
    }
    const data = matches[2]
    if (!data) {
      return { ok: false, error: 'image data is empty' }
    }
    const buffer = Buffer.from(data, 'base64')
    const dir = path.dirname(normalizedPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(normalizedPath, buffer)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message || 'write failed' }
  }
}
