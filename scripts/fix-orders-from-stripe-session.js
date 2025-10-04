// Fetch expanded Stripe checkout sessions referenced in order.notes
// and populate shippingPrefecture/shippingCity/shippingRest for orders missing them.
// Usage: STRIPE_SECRET_KEY=sk_... node scripts/fix-orders-from-stripe-session.js

const { PrismaClient } = require('@prisma/client')
let Stripe
try {
  Stripe = require('stripe')
} catch (e) {
  // stripe package may not be installed in some dev setups; we'll only require it when actually running
}

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true'

  // Find orders that have notes containing "Stripe Session ID:" but missing shippingRest
  const candidates = await prisma.order.findMany({ where: { notes: { contains: 'Stripe Session ID:' } } })
  console.log('Found', candidates.length, 'orders with Stripe Session notes')

  // Build list of (orderId, sessionId) pairs to process
  const pairs = []
  for (const o of candidates) {
    const note = o.notes || ''
    const m = note.match(/Stripe Session ID:\s*([A-Za-z0-9_\-]+)/)
    if (!m) continue
    const sessionId = m[1]
    pairs.push({ order: o, sessionId })
  }

  if (pairs.length === 0) {
    console.log('No candidate sessions found in notes')
    return
  }

  const apply = process.argv.includes('--apply') || process.env.APPLY === 'true'
  const backupFileArg = process.argv.find(a => a.startsWith('--backup-file='))
  const backupFile = backupFileArg ? backupFileArg.split('=')[1] : (process.env.BACKUP_FILE || undefined)

  if (!apply) {
    console.log('Dry run mode - will not contact Stripe or update DB. Found candidate pairs:')
    for (const p of pairs) {
      const o = p.order
      const needs = []
      if (!o.shippingPrefecture) needs.push('shippingPrefecture')
      if (!o.shippingCity) needs.push('shippingCity')
      if (!o.shippingRest) needs.push('shippingRest')
      console.log({ orderId: o.id, sessionId: p.sessionId, missing: needs })
    }
    console.log('\nTo actually apply updates, re-run with --apply and optionally --backup-file=path to save pre-update values.')
    return
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY
  if (!stripeKey) {
    console.error('Missing STRIPE_SECRET_KEY environment variable. For non-dry-run you must set it and re-run.')
    process.exit(1)
  }
  if (!Stripe) {
    console.error('stripe package not available. Run `npm install stripe` and try again.')
    process.exit(1)
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' })

  const fs = require('fs')
  const backupStream = backupFile ? fs.createWriteStream(backupFile, { flags: 'a' }) : null

  for (const p of pairs) {
    const o = p.order
    const sessionId = p.sessionId
    try {
      if (o.shippingRest && o.shippingRest.trim().length > 0 && o.shippingPrefecture && o.shippingCity) {
        console.log('Skipping (already has shipping fields):', o.id)
        continue
      }
      console.log('Fetching session from Stripe for order:', o.id, sessionId)
      let session
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['shipping_details'] })
      } catch (err) {
        console.warn('Could not retrieve session', sessionId, err && err.message ? err.message : err)
        continue
      }
      const sd = session && session.shipping_details ? session.shipping_details : undefined
      if (!sd || !sd.address) {
        console.log('No shipping_details.address on session:', sessionId)
        continue
      }
      const addr = sd.address || {}
      const prefecture = addr.state || undefined
      const city = addr.city || undefined
      const rest = [addr.line1, addr.line2].filter(Boolean).join(' ') || undefined

      const data = {}
      if (prefecture && !o.shippingPrefecture) data.shippingPrefecture = prefecture
      if (city && !o.shippingCity) data.shippingCity = city
      if (rest && !o.shippingRest) data.shippingRest = rest

      if (Object.keys(data).length > 0) {
        // write backup record before applying
        if (backupStream) {
          const before = { id: o.id, shippingPrefecture: o.shippingPrefecture || null, shippingCity: o.shippingCity || null, shippingRest: o.shippingRest || null, postalCode: o.postalCode || null }
          backupStream.write(JSON.stringify({ ts: new Date().toISOString(), before, sessionId }) + '\n')
        }
        await prisma.order.update({ where: { id: o.id }, data })
        console.log('Updated order', o.id, data)
      } else {
        console.log('No update needed for order', o.id)
      }
    } catch (e) {
      console.warn('Failed processing order', o.id, e)
    }
  }
  if (backupStream) {
    backupStream.end()
    console.log('Backup written to', backupFile)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
