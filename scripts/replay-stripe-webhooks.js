#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const http = require('http')

function usage() {
  console.log('Usage: node scripts/replay-stripe-webhooks.js --id <eventId> [--url <webhookUrl>]')
  process.exit(1)
}

const args = process.argv.slice(2)
let eventId = null
let webhookUrl = 'http://localhost:3000/api/stripe/webhook'
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id') { eventId = args[++i] }
  if (args[i] === '--url') { webhookUrl = args[++i] }
}
if (!eventId) usage()

const file = path.resolve(__dirname, '..', 'tmp', 'stripe-webhook-logs.jsonl')
if (!fs.existsSync(file)) {
  console.error('Log file not found:', file)
  process.exit(2)
}

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
let found = null
for (const l of lines) {
  try {
    const obj = JSON.parse(l)
    const id = obj?.body?.id || (obj?.body?.data && obj.body.data.id) || obj?.body?.data?.object?.id
    if (id === eventId || obj?.body?.id === eventId) {
      found = obj
      break
    }
  } catch (e) {
    // skip
  }
}
if (!found) {
  console.error('Event not found in log for id:', eventId)
  process.exit(3)
}

const raw = found.rawBody || JSON.stringify(found.body)
const signature = (found.headers && (found.headers['stripe-signature'] || found.headers['Stripe-Signature'])) || ''

console.log('Replaying event', eventId, 'to', webhookUrl)

const u = new URL(webhookUrl)
const req = http.request({ method: 'POST', hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(raw), 'stripe-signature': signature } }, (res) => {
  console.log('Response status:', res.statusCode)
  let body = ''
  res.on('data', (c) => body += c)
  res.on('end', () => {
    console.log('Response body:', body)
  })
})
req.on('error', (err) => {
  console.error('Request error:', err.message)
})
req.write(raw)
req.end()
