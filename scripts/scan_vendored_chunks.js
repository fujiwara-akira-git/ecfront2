const fs = require('fs')
const path = require('path')

const chunksDir = path.resolve(process.cwd(), '.next/server/chunks')
const out = []
if (!fs.existsSync(chunksDir)) {
  console.error('Chunks dir not found:', chunksDir)
  process.exit(1)
}
const files = fs.readdirSync(chunksDir).filter(f=>f.endsWith('.js'))
for (const f of files) {
  const p = path.join(chunksDir, f)
  const s = fs.readFileSync(p,'utf8')
  const hits = []
  const vendPat = /\bvendored\b/g
  const vendorChunkPat = /require\(["']\.\/vendor-chunks\/[^"']+\.js["']\)/g
  let m
  while ((m = vendPat.exec(s)) !== null) {
    const idx = m.index
    const ctx = s.slice(Math.max(0, idx-120), Math.min(s.length, idx+120))
    hits.push({type:'vendored', index: idx, context: ctx})
  }
  while ((m = vendorChunkPat.exec(s)) !== null) {
    const idx = m.index
    const ctx = s.slice(Math.max(0, idx-120), Math.min(s.length, idx+120))
    hits.push({type:'require-vendor-chunk', index: idx, context: ctx})
  }
  if (hits.length) out.push({file: f, path: p, hits})
}
fs.writeFileSync('/tmp/vendored_scan.json', JSON.stringify(out, null, 2))
console.log('Wrote /tmp/vendored_scan.json with', out.length, 'files')
