const fs = require('fs')
const path = require('path')

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const content = fs.readFileSync(p, 'utf8')
  const lines = content.split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    let val = trimmed.slice(idx + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

(async () => {
  try {
    const repoRoot = process.cwd()
    const envPath = path.join(repoRoot, '.env.local')
    const env = loadEnvFile(envPath)
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL
      console.log('Loaded DATABASE_URL from .env.local')
    } else if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not found in .env.local or environment')
      process.exit(1)
    }

    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // find invalid products
    const prods = await prisma.product.findMany({ select: { id: true, name: true, image: true } })
    const invalid = prods.filter(p => typeof p.image === 'string' && p.image.trim() !== '' && !(/^\/|^https?:\/\//i.test(p.image.trim())))

    console.log(`Found ${invalid.length} invalid image entries`)
    if (invalid.length === 0) {
      await prisma.$disconnect()
      return
    }

    // perform updates and report
    const updated = []
    for (const p of invalid) {
      const res = await prisma.product.update({ where: { id: p.id }, data: { image: '' } })
      updated.push({ id: res.id, name: res.name })
    }

    console.log('Updated records:', updated)

    await prisma.$disconnect()
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
})()
