#!/usr/bin/env node
/*
Bulk-process pre-created Orders in dev by replaying saved webhook payloads.

How it works:
- Lists Orders where preCreated = true and status = 'pending'.
- Scans tmp/stripe-webhook-logs.jsonl for entries whose rawBody contains a checkout.session id or payment_intent that matches the Order metadata.
- POSTs the rawBody to the dev runner endpoint at http://localhost:3001/api/dev/run-webhook

Safety:
- This script refuses to run when NODE_ENV=production.
*/

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run in production NODE_ENV')
  process.exit(1)
}

async function main() {
  // Query DB via psql to avoid runtime dependency on compiled TS prisma client
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:5432/dev'
  const sql = `SELECT json_agg(row_to_json(t)) FROM (SELECT id, "postalCode", "shippingPrefecture", "shippingCity", "shippingRest" FROM "Order" WHERE "preCreated" = true AND status = 'pending') t;`
  const tmpSqlPath = path.resolve(__dirname, '..', 'tmp', `query_orders_${Date.now()}.sql`)
  fs.writeFileSync(tmpSqlPath, sql)

  let out
  try {
    out = execSync(`psql "${DATABASE_URL}" -At -f "${tmpSqlPath}"`, { encoding: 'utf8' })
  } finally {
    try { fs.unlinkSync(tmpSqlPath) } catch (e) { /* ignore */ }
  }

  let orders = []
  if (out && out.trim() && out.trim() !== 'null') {
    try { orders = JSON.parse(out.trim()) } catch (e) { console.error('Failed to parse psql output', e); process.exit(1) }
  }

  if (!orders.length) {
    console.log('No pending preCreated orders found.')
    return
  }

  const logsPath = path.resolve(__dirname, '..', 'tmp', 'stripe-webhook-logs.jsonl')
  if (!fs.existsSync(logsPath)) {
    console.error('Missing tmp/stripe-webhook-logs.jsonl; cannot replay.')
    process.exit(1)
  }

  const lines = fs.readFileSync(logsPath, 'utf8').trim().split('\n')

  for (const order of orders) {
    console.log('Processing order', order.id)

    // Try to find a log entry that references this order's postalCode or shipping address
    let matched = null

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        const raw = entry.rawBody || ''
        if (!raw) continue

        // Match by checkout.session id pattern or payment_intent or order.id
        if (raw.includes(order.id)) {
          matched = entry
          break
        }

        if (order.postalCode && raw.includes(order.postalCode)) {
          matched = entry
          break
        }

        if (order.shippingCity && raw.includes(order.shippingCity)) {
          matched = entry
          break
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    if (!matched) {
      console.warn('No matching webhook payload found for order', order.id)
      continue
    }

    console.log('Found matching event', matched.id, '- posting to dev-runner')

    try {
      const res = await fetch('http://localhost:3001/api/dev/run-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: matched.rawBody,
      })

      const text = await res.text()
      console.log('Response', res.status, text)
    } catch (err) {
      console.error('Failed to POST to dev-runner for order', order.id, err.message)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
