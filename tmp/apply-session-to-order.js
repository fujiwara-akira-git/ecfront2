const Stripe = require('stripe')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const sessionId = process.argv[2]
  if (!sessionId) {
    console.error('Usage: node tmp/apply-session-to-order.js <sessionId>')
    process.exit(2)
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY || ''
  if (!stripeSecret) {
    console.error('No STRIPE_SECRET_KEY/STRIPE_TEST_KEY in env; cannot fetch session')
    process.exit(3)
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27' })

  try {
    console.log('Fetching session from Stripe:', sessionId)
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent', 'line_items', 'customer'] })
    console.log('Session fetched: id=', session.id, 'payment_status=', session.payment_status)
    const sd = session.shipping_details && session.shipping_details.address ? session.shipping_details.address : null
    console.log('session.shipping_details.address:', sd)

    if (!sd) {
      console.log('No structured shipping_details on session; nothing to apply')
      process.exit(0)
    }

    const prefecture = sd.state || null
    const city = sd.city || null
    const rest = [sd.line1, sd.line2].filter(Boolean).join(' ') || null

    // find order by notes containing session id
    const found = await prisma.order.findFirst({ where: { notes: { contains: sessionId } } })
    if (!found) {
      console.log('No order found with notes containing session id:', sessionId)
      process.exit(0)
    }

    console.log('Found order:', found.id, 'current shippingAddress:', found.shippingAddress, 'postalCode:', found.postalCode)

    const data = {}
    if (prefecture) data.shippingPrefecture = prefecture
    if (city) data.shippingCity = city
    if (rest) data.shippingRest = rest

    if (Object.keys(data).length === 0) {
      console.log('No address parts to update')
      process.exit(0)
    }

    const updated = await prisma.order.update({ where: { id: found.id }, data })
    console.log('Order updated:', JSON.stringify({ id: updated.id, shippingPrefecture: updated.shippingPrefecture, shippingCity: updated.shippingCity, shippingRest: updated.shippingRest }, null, 2))
  } catch (err) {
    console.error('Error during fetch/apply:', err)
    process.exit(4)
  } finally {
    await prisma.$disconnect()
  }
}

main()
