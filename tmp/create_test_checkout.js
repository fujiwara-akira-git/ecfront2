const Stripe = require('stripe')
const fs = require('fs')

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('STRIPE_SECRET_KEY not set in env')
    process.exit(1)
  }
  const stripe = Stripe(key, { apiVersion: '2025-08-27.basil' })

  // target order id
  const orderId = '6093c5c3-b5de-40d0-a6ed-5517e1dee65f'

  // create minimal checkout session with metadata
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      { price_data: { currency: 'jpy', product_data: { name: 'Test product' }, unit_amount: 1000 }, quantity: 1 }
    ],
    metadata: { orderId },
    success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://example.com/cancel'
  })

  console.log('created session id:', session.id)
  fs.writeFileSync('tmp/last_test_session_id.txt', session.id)
}

main().catch(err => { console.error(err); process.exit(1) })
