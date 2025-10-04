const Stripe = require('stripe')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.error('STRIPE_SECRET_KEY is not set in .env.local')
  process.exit(1)
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

async function main() {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: { name: 'Test' },
          unit_amount: 1000
        },
        quantity: 1
      }
    ],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
    shipping_address_collection: { allowed_countries: ['JP'] },
    metadata: { deliveryService: 'japanpost', weightGrams: '500', postalCode: '150-0001' }
  })
  console.log('created session id=', session.id)
}

main().catch(e => { console.error(e); process.exit(1) })
