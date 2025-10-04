// Restore orders from a JSONL backup created by fix-orders-from-stripe-session.js
// Usage (dry-run): node scripts/restore-orders-from-backup.js --backup-file=./stripe-orders-backup.jsonl
// To actually apply: node scripts/restore-orders-from-backup.js --backup-file=./stripe-orders-backup.jsonl --apply

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

async function main() {
  const backupArg = process.argv.find(a => a.startsWith('--backup-file='))
  const backupFile = backupArg ? backupArg.split('=')[1] : (process.env.BACKUP_FILE || undefined)
  const apply = process.argv.includes('--apply') || process.env.APPLY === 'true'

  if (!backupFile) {
    console.error('Specify --backup-file=path')
    process.exit(1)
  }
  if (!fs.existsSync(backupFile)) {
    console.error('Backup file not found:', backupFile)
    process.exit(1)
  }

  const lines = fs.readFileSync(backupFile, 'utf8').split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) {
    console.log('No entries in backup file')
    return
  }

  const entries = lines.map(l => {
    try { return JSON.parse(l) } catch(e) { return null }
  }).filter(Boolean)

  console.log('Parsed', entries.length, 'entries from backup')
  for (const e of entries) console.log(e.before ? { id: e.before.id, before: e.before } : e)

  if (!apply) {
    console.log('\nDry run - no changes made. Re-run with --apply to restore values.')
    return
  }

  const prisma = new PrismaClient()
  try {
    for (const ent of entries) {
      if (!ent || !ent.before || !ent.before.id) continue
      const id = ent.before.id
      const data = {
        shippingPrefecture: ent.before.shippingPrefecture || null,
        shippingCity: ent.before.shippingCity || null,
        shippingRest: ent.before.shippingRest || null
      }
      console.log('Restoring', id, data)
      await prisma.order.update({ where: { id }, data })
    }
    console.log('Restore complete')
  } catch (e) {
    console.error('Restore failed', e)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e=>{console.error(e); process.exit(1)})
