const fs = require('fs')
const path = require('path')

const root = process.cwd()
const searchDirs = ['.next']
const vendorDir = path.join(root, '.next', 'server', 'vendor-chunks')
if (!fs.existsSync(vendorDir)) {
  fs.mkdirSync(vendorDir, { recursive: true })
}
const refSet = new Set()
function scanFile(p) {
  const s = fs.readFileSync(p,'utf8')
  const re = /vendor-chunks\/([\w@\-\.]+\.js)/g
  let m
  while ((m = re.exec(s)) !== null) {
    refSet.add(m[1])
  }
}
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkDir(p)
    else if (e.isFile()) {
      try { scanFile(p) } catch (err) {}
    }
  }
}
for (const d of searchDirs) {
  const dd = path.join(root, d)
  if (fs.existsSync(dd)) walkDir(dd)
}
const refs = Array.from(refSet)
console.log('Found vendor-chunk refs:', refs.length)
refs.forEach(name => console.log(' -', name))

const created = []
refs.forEach(fn => {
  const outPath = path.join(vendorDir, fn)
  if (fs.existsSync(outPath)) return
  const base = fn.replace(/\.js$/, '')
  const content = `// Auto-generated shim for vendor-chunk ${fn}\ntry {\n  module.exports = require('${base}')\n} catch (e) {\n  try { module.exports = require('${base.replace(/@/g,'')}') } catch (e2) {\n    module.exports = {}\n  }\n}\n`
  try {
    fs.writeFileSync(outPath, content)
    created.push(outPath)
  } catch (err) {}
})
console.log('Created', created.length, 'shim(s)')
if (created.length) console.log(created.join('\n'))
else console.log('No new shims needed')
