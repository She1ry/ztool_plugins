const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('mineruSaveFile', {
  saveMarkdown: (content, filePath) => {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  },
  readFileBase64: (filePath) => {
    const buffer = fs.readFileSync(filePath)
    return buffer.toString('base64')
  }
})
