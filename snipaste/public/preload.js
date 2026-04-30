const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('snipasteSaveImage', (base64, filePath) => {
  try {
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) return false
    const data = matches[2]
    const buffer = Buffer.from(data, 'base64')
    fs.writeFileSync(filePath, buffer)
    return true
  } catch (e) {
    return false
  }
})
