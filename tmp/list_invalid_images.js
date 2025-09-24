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
    // remove surrounding quotes
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

    // fetch products with non-empty image
    const prods = await prisma.product.findMany({ select: { id: true, name: true, image: true } })

    const invalid = prods.filter(p => typeof p.image === 'string' && p.image.trim() !== '' && !(/^\/|^https?:\/\//i.test(p.image.trim())))

    console.log(`Total products: ${prods.length}`)
    console.log(`Invalid image entries: ${invalid.length}`)

    if (invalid.length > 0) {
      const samples = invalid.slice(0, 50)
      console.log('Samples:')
      console.log(JSON.stringify(samples, null, 2))

      const backupPath = path.join('/tmp', `product-image-backup-${Date.now()}.json`)
      fs.writeFileSync(backupPath, JSON.stringify(invalid, null, 2), 'utf8')
      console.log('Backup of invalid entries written to', backupPath)
    }

    await prisma.$disconnect()
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
})()
