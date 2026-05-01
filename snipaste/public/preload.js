const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('snipasteSaveImage', (base64, filePath) => {
  try {
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      console.error('[snipaste] invalid base64 data URL')
      return false
    }
    const data = matches[2]
    const buffer = Buffer.from(data, 'base64')
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, buffer)
    return true
  } catch (e) {
    console.error('[snipaste] save failed:', e.message)
    return false
  }
})
