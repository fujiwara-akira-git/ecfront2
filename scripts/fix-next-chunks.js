#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const chunksDir = path.resolve(__dirname, '..', '.next', 'static', 'chunks')

// CLI flags
const args = process.argv.slice(2)
const doClean = args.includes('--clean')
const dryRun = args.includes('--dry-run')

function isHashed(name) {
  // matches patterns like name-<hash>.js or name-<hash>.css and their map files
  return /^(.*)-[a-f0-9]{6,}\.((js|css)(\.map)?)$/.test(name)
}

function baseNameFromHashed(name) {
  // extract the base name (strip -<hash>)
  return name.replace(/(-[a-f0-9]{6,})(?=\.(js|css|js.map|css.map)$)/, '')
}

function isAliasCandidate(name) {
  // candidate unhashed files we might have created
  return /^.+\.(js|css|js.map|css.map)$/.test(name) && !isHashed(name)
}

function createAliases() {
  if (!fs.existsSync(chunksDir)) {
    console.log('[fix-next-chunks] chunks directory not found, skipping')
    return
  }

  const files = fs.readdirSync(chunksDir)
  let created = 0

  files.forEach(file => {
    if (!isHashed(file)) return
    const base = baseNameFromHashed(file)
    const src = path.join(chunksDir, file)
    const dest = path.join(chunksDir, base)

    try {
      // don't overwrite if a file with the base name already exists
      if (fs.existsSync(dest)) return
      if (dryRun) {
        console.log('[fix-next-chunks][dry-run] would create alias', dest, '<--', src)
      } else {
        fs.copyFileSync(src, dest)
        console.log('[fix-next-chunks] created alias', dest, '<--', src)
      }
      created++
    } catch (err) {
      console.error('[fix-next-chunks] error copying', src, '->', dest, err)
      process.exitCode = 1
    }
  })

  if (created === 0) {
    console.log('[fix-next-chunks] no hashed chunk files found or aliases already exist')
  } else {
    console.log(`[fix-next-chunks] created ${created} aliases`)
  }
}

function cleanStaleAliases() {
  if (!fs.existsSync(chunksDir)) return
  const files = fs.readdirSync(chunksDir)
  let removed = 0

  files.forEach(file => {
    if (!isAliasCandidate(file)) return
    const base = file
    // determine whether a hashed source exists for this base
    const hashedExists = files.some(f => {
      try {
        return baseNameFromHashed(f) === base && isHashed(f)
      } catch (e) {
        return false
      }
    })

    if (!hashedExists) {
      const target = path.join(chunksDir, base)
      if (dryRun) {
        console.log('[fix-next-chunks][dry-run] would remove stale alias', target)
      } else {
        try {
          fs.unlinkSync(target)
          console.log('[fix-next-chunks] removed stale alias', target)
          removed++
        } catch (err) {
          console.error('[fix-next-chunks] error removing', target, err)
          process.exitCode = 1
        }
      }
    }
  })

  if (removed === 0) {
    console.log('[fix-next-chunks] no stale aliases removed')
  } else {
    console.log(`[fix-next-chunks] removed ${removed} stale aliases`)
  }
}

// Run create first, then clean if requested
createAliases()
if (doClean) {
  cleanStaleAliases()
}

if (dryRun) console.log('[fix-next-chunks] dry-run complete')
