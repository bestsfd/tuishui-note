import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'tesseract')
mkdirSync(dest, { recursive: true })

const worker = join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')
cpSync(worker, join(dest, 'worker.min.js'))

const coreDir = join(root, 'node_modules', 'tesseract.js-core')

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (name.includes('simd-lstm') && (name.endsWith('.wasm') || name.endsWith('.js'))) {
      cpSync(path, join(dest, name))
    }
  }
}

walk(coreDir)
console.log('copied tesseract runtime into public/tesseract')
