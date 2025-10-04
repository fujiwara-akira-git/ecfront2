#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-08-27.basil' })
const sessionId = process.argv[2]
if (!sessionId) {
  console.error('Usage: node scripts/check-session-line-items.js <sessionId>')
  process.exit(1)
}
(async ()=>{
  try {
    console.log('retrieving session with expand line_items...')
    const sess = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items','payment_intent','customer'] })
    console.log('session.amount_total', sess.amount_total, 'currency', sess.currency, 'payment_status', sess.payment_status)
    console.log('has line_items property?', !!sess.line_items)
    try { console.log('line_items keys:', sess.line_items && Object.keys(sess.line_items)) } catch(e){}
    try { console.log('line_items.data length:', sess.line_items && Array.isArray(sess.line_items.data) ? sess.line_items.data.length : 'no data') } catch(e){}

    console.log('\ncalling listLineItems...')
    const li = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 })
    console.log('listLineItems total:', li && li.data && li.data.length)
    if (li && Array.isArray(li.data)) {
      li.data.forEach((it, idx) => {
        console.log('item', idx, { id: it.id, description: it.description, quantity: it.quantity, price: it.price && it.price.unit_amount })
      })
    }
  } catch (err) {
    console.error('error', err)
    process.exit(1)
  }
})()
