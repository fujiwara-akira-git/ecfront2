const crypto = require('crypto')
const fs = require('fs')
const fetch = require('node-fetch')

async function main() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) { console.error('No STRIPE_WEBHOOK_SECRET'); process.exit(1) }
  const payload = {
    id: 'evt_manual_cs_test',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: process.argv[2] || 'cs_test_a1NltyyP3DbdQuJDuh91VTjpSSByXEqSTnDAgGY4WbN',
        metadata: { orderId: process.argv[3] || '6093c5c3-b5de-40d0-a6ed-5517e1dee65f' },
        amount_total: 2780,
        currency: 'jpy',
        payment_status: 'paid',
        payment_intent: 'pi_manual_for_test',
        customer_details: { name: 'Test User', email: 'test@example.com', address: { line1: '1-2-3', city: 'Chiyoda', state: 'Tokyo', postal_code: '100-0001', country: 'JP' } }
      }
    }
  }

  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${body}`
  const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex')
  const header = `t=${timestamp},v1=${signature}`

  const res = await fetch('http://localhost:3000/api/payments/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': header
    },
    body
  })
  console.log('response status:', res.status)
  const text = await res.text()
  console.log('response body:', text)
}

main().catch(e => { console.error(e); process.exit(1) })
