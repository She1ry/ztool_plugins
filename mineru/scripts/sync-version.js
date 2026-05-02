import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const pluginPath = resolve(root, 'public', 'plugin.json')
const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'))

plugin.version = pkg.version
writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n', 'utf-8')

execSync(`git add "${pluginPath}"`, { cwd: root })

console.log(`synced version ${pkg.version} to plugin.json`)
