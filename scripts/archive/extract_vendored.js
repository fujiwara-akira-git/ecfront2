#!/usr/bin/env node
const fs = require('fs')

function extractModule(source, moduleId) {
  const needle = moduleId + ':'
  const idx = source.indexOf(needle)
  if (idx === -1) return null

  // find the first '{' after the colon
  let i = source.indexOf('{', idx + needle.length)
  if (i === -1) return null

  let depth = 0
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let inRegex = false
  let prev = ''
  let resultStart = i

  for (; i < source.length; i++) {
    const ch = source[i]
    const two = prev + ch

    // handle comment starts
    if (!inSingle && !inDouble && !inBacktick && !inRegex) {
      if (two === '//') {
        // skip till end of line
        i = source.indexOf('\n', i + 1)
        if (i === -1) return null
        prev = ''
        continue
      }
      if (two === '/*') {
        // skip until */
        const end = source.indexOf('*/', i + 1)
        if (end === -1) return null
        i = end + 1
        prev = ''
        continue
      }
    }

    if (!inSingle && !inDouble && !inBacktick && ch === '/') {
      // naive regex detection: if previous non-space char is one of (=,:;!&|?([{ or start, treat as regex
      let j = i - 1
      while (j >= 0 && /\s/.test(source[j])) j--
      const prevCh = j >= 0 ? source[j] : ''
      if ('=,:;!&|?([{'.includes(prevCh) || prevCh === '') {
        inRegex = true
        prev = ch
        continue
      }
    }

    if (inRegex) {
      if (ch === '/' && prev !== '\\') {
        inRegex = false
      }
      prev = ch
      continue
    }

    if (!inDouble && !inBacktick && ch === "'" && prev !== '\\') {
      inSingle = !inSingle
      prev = ch
      continue
    }
    if (!inSingle && !inBacktick && ch === '"' && prev !== '\\') {
      inDouble = !inDouble
      prev = ch
      continue
    }
    if (!inSingle && !inDouble && ch === '`' && prev !== '\\') {
      inBacktick = !inBacktick
      prev = ch
      continue
    }

    if (inBacktick) {
      // handle ${ ... } inside template literals
      if (ch === '$' && source[i+1] === '{') {
        depth++
        i++
        prev = ''
        continue
      }
      if (ch === '}' && depth > 0) {
        depth--
      }
      prev = ch
      continue
    }

    if (!inSingle && !inDouble && ch === '{') {
      depth++
    } else if (!inSingle && !inDouble && ch === '}') {
      depth--
      if (depth === 0) {
        // include the closing brace
        return source.slice(resultStart, i + 1)
      }
    }

    // handle escaping
    if (ch === '\\' && (inSingle || inDouble || inBacktick || inRegex)) {
      // skip next char
      i++
      prev = ''
      continue
    }

    prev = ch
  }
  return null
}

function extractVendoredObject(moduleText) {
  if (!moduleText) return null
  const keyPat = /vendored\s*:\s*/g
  let m
  while ((m = keyPat.exec(moduleText)) !== null) {
    let idx = m.index + m[0].length
    // find first '{' after idx
    const start = moduleText.indexOf('{', idx)
    if (start === -1) continue
    // balance braces similarly
    let depth = 0
    let inSingle = false, inDouble = false, inBacktick = false
    let prev = ''
    for (let i = start; i < moduleText.length; i++) {
      const ch = moduleText[i]
      const two = prev + ch
      if (!inSingle && !inDouble && !inBacktick) {
        if (two === '//') { i = moduleText.indexOf('\n', i+1); if (i===-1) break; prev=''; continue }
        if (two === '/*') { const e = moduleText.indexOf('*/', i+1); if (e===-1) break; i = e+1; prev=''; continue }
      }
      if (!inDouble && !inBacktick && ch === "'" && prev !== '\\') { inSingle = !inSingle; prev = ch; continue }
      if (!inSingle && !inBacktick && ch === '"' && prev !== '\\') { inDouble = !inDouble; prev = ch; continue }
      if (!inSingle && !inDouble && ch === '`' && prev !== '\\') { inBacktick = !inBacktick; prev = ch; continue }
      if (!inSingle && !inDouble && ch === '{') depth++
      else if (!inSingle && !inDouble && ch === '}') { depth--; if (depth === 0) return moduleText.slice(start, i+1) }
      if (ch === '\\' && (inSingle || inDouble || inBacktick)) { i++; prev=''; continue }
      prev = ch
    }
  }
  return null
}

function usage(){
  console.error('Usage: node scripts/extract_vendored.js <chunk-file> <moduleId>')
  process.exit(2)
}

if (require.main === module) {
  const [,, file, moduleId] = process.argv
  if (!file || !moduleId) usage()
  const src = fs.readFileSync(file, 'utf8')
  const mod = extractModule(src, moduleId)
  if (!mod) {
    console.error('Module not found in file')
    process.exit(1)
  }
  console.error('--- MODULE EXTRACT START ---')
  console.log(mod)
  console.error('--- MODULE EXTRACT END ---')

  const vend = extractVendoredObject(mod)
  if (vend) {
    console.error('--- VENDORED OBJECT START ---')
    console.log(vend)
    console.error('--- VENDORED OBJECT END ---')
  } else {
    // search for 'next-auth' in module
    const idx = mod.indexOf('next-auth')
    if (idx !== -1) {
      const start = Math.max(0, idx-200)
      const end = Math.min(mod.length, idx+200)
      console.error('Found "next-auth" near:')
      console.log(mod.slice(start,end))
    } else {
      console.error('vendored object and next-auth not found inside module')
    }
  }
}
