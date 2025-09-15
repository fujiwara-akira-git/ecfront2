import Stripe from 'stripe'
import { prisma } from '../lib/prisma'

// Usage: node ./scripts/backfill-stripe-ids.ts [--apply]
// Requires STRIPE_SECRET_KEY and DATABASE_URL in environment.

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY required')
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' })

  const apply = process.argv.includes('--apply')
  console.log('Backfill stripe IDs - mode:', apply ? 'apply' : 'dry-run')

  const candidates = await prisma.payment.findMany({
    where: {
      OR: [
        { stripeId: null },
        { stripeId: '' }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  if (candidates.length === 0) {
    console.log('No candidate payments found')
    return
  }

  for (const p of candidates) {
    console.log('---')
    console.log('Payment:', p.id, 'orderId:', p.orderId, 'amount:', p.amount, 'createdAt:', p.createdAt)

    // Find StripeEvent that references this orderId
    // Use a raw SQL query to search JSON payload text for the orderId
    // This avoids Prisma JsonFilter typing limitations and works on Postgres
    const likePattern = `%${p.orderId}%`
    const events = await prisma.$queryRaw<any[]>`
      SELECT * FROM "StripeEvent" WHERE payload::text LIKE ${likePattern} ORDER BY "createdAt" ASC
    `

    if (events.length === 0) {
      console.log('  No StripeEvent found referencing orderId')
      continue
    }

    for (const e of events) {
      console.log('  Event:', e.id, e.type, e.createdAt)
    }

    // Try to get sessionId from first event payload
    let sessionId: string | undefined
    try {
      const ev = events[0]
      const payload = ev.payload as any
      sessionId = payload?.data?.object?.id
    } catch (err) {
      // ignore
    }

    if (!sessionId) {
      console.log('  No sessionId in event payload; cannot fetch from Stripe')
      continue
    }

    console.log('  sessionId:', sessionId)

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent', 'payment_intent.charges'] })
      console.log('  session.amount_total:', session.amount_total)
      const pi = session.payment_intent as any
      if (pi) {
        console.log('  payment_intent found:', typeof pi === 'string' ? pi : pi.id)
        const latestCharge = pi.latest_charge || (pi.charges && pi.charges.data && pi.charges.data[0])
        if (latestCharge) {
          console.log('  latest_charge id:', typeof latestCharge === 'string' ? latestCharge : latestCharge.id)
        }
      } else {
        console.log('  No payment_intent on session')
      }

      // propose update
      const resolved = (pi && (typeof pi === 'string' ? pi : pi.id)) || (pi && (pi.latest_charge || (pi.charges && pi.charges.data && pi.charges.data[0]) && (typeof (pi.charges.data[0]) === 'string' ? pi.charges.data[0] : pi.charges.data[0].id)))
      console.log('  resolvedStripeId:', resolved)

      if (resolved && apply) {
        await prisma.payment.update({ where: { id: p.id }, data: { stripeId: resolved } })
        console.log('  UPDATED stripeId for payment', p.id)
      }
    } catch (err: any) {
      console.warn('  stripe retrieve failed:', err.message || err)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
