#!/usr/bin/env node
/*
  Verify signatures for events in tmp/stripe-webhook-matches.jsonl
  Usage: STRIPE_WEBHOOK_SECRET=whsec_xxx node tmp/verify-webhook-signatures.js
*/
const fs = require('fs')
const path = require('path')
const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!stripeSecret) {
  console.error('Please set STRIPE_WEBHOOK_SECRET env var')
  process.exit(2)
}
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '')
const matchesPath = path.resolve(__dirname, 'stripe-webhook-matches.jsonl')
const outPath = path.resolve(__dirname, 'stripe-webhook-signature-verification.jsonl')
if (!fs.existsSync(matchesPath)) {
  console.error('matches file not found:', matchesPath)
  process.exit(2)
}
const rl = require('readline').createInterface({
  input: fs.createReadStream(matchesPath),
  crlfDelay: Infinity,
})
const out = fs.createWriteStream(outPath, { flags: 'w' })
let total = 0
let valid = 0
rl.on('line', (line) => {
  if (!line) return
  total++
  try {
    const obj = JSON.parse(line)
    const sig = obj.headers && (obj.headers['stripe-signature'] || obj.headers['Stripe-Signature'])
    const rawBody = obj.rawBody
    let ok = false
    try {
      // stripe.webhooks.constructEvent expects raw body as string or Buffer
      stripe.webhooks.constructEvent(rawBody, sig, stripeSecret)
      ok = true
      valid++
    } catch (err) {
      ok = false
    }
    const outObj = { eventId: obj.eventId, sessionId: obj.sessionId, hasSignature: !!sig, signatureValid: ok }
    out.write(JSON.stringify(outObj) + '\n')
  } catch (err) {
    // ignore parse errors
  }
})
rl.on('close', () => {
  out.end()
  console.log(`wrote verification results to ${outPath} — total=${total} valid=${valid}`)
})
