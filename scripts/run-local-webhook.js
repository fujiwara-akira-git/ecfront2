#!/usr/bin/env node
// Run a saved Stripe Event payload through stripeProvider.handleWebhookEvent directly
const fs = require('fs')
const path = require('path')
;(async function(){
  try {
    const p = path.resolve(__dirname, '..', 'tmp', 'replay_evt_manual_cs_test.json')
    if (!fs.existsSync(p)) {
      console.error('payload file not found:', p)
      process.exit(2)
    }
    const raw = fs.readFileSync(p,'utf8')
    const obj = JSON.parse(raw)
    const { stripeProvider } = require('../lib/providers/stripe')
    console.log('Invoking stripeProvider.handleWebhookEvent with payload id=', obj.id)
    await stripeProvider.handleWebhookEvent(obj)
    console.log('Done')
  } catch (e) {
    console.error('error running local webhook:', e && e.stack ? e.stack : e)
    process.exit(1)
  }
})()
