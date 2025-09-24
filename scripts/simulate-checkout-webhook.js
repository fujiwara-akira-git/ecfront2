#!/usr/bin/env node
const { fetch } = require('undici')
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find a recent session id from stripeEvent or payments to reuse
  const evt = await prisma.stripeEvent.findFirst({ where: { type: 'checkout.session.completed' }, orderBy: { createdAt: 'desc' } })
  if (!evt) {
    console.error('no recent checkout.session.completed event found in DB to reuse payload sample')
    process.exit(1)
  }

  // Use the payload as-is but ensure id and type
  const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload
  // use a random id to avoid hitting an already-processed event in DB
  const { randomUUID } = require('crypto')
  payload.id = `sim_${randomUUID()}`
  payload.type = 'checkout.session.completed'
  // ensure data.object.id exists
  if (!payload.data) payload.data = {}
  if (!payload.data.object) payload.data.object = {}
  payload.data.object.id = payload.data.object.id || `sess_${Date.now()}_${Math.floor(Math.random()*100000)}`
  // Allow forcing metadata.orderId via env var for targeted testing
  const forcedOrderId = process.env.FORCE_ORDER_ID || process.env.ORDER_ID || undefined
  if (!payload.data.object.metadata) payload.data.object.metadata = {}
  if (forcedOrderId) {
    payload.data.object.metadata.orderId = forcedOrderId
    console.log('[simulate] forced metadata.orderId =', forcedOrderId)
  }

  const url = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/api/stripe/webhook'
  console.log('POST =>', url)
  // generate Stripe-like signature: t=timestamp,v1=hex
  const crypto = require('crypto')
  const timestamp = Math.floor(Date.now() / 1000)
  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const sigHeader = `t=${timestamp},v1=${signature}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sigHeader },
    body: JSON.stringify(payload)
  })
  console.log('status', res.status)
  const text = await res.text()
  console.log('response:', text)

  // inspect whether orderItems were created for the most recent order
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { orderItems: true, payments: true } })
  console.log('latest orders after simulation:')
  orders.forEach(o => {
    console.log('-', o.id, 'items:', (o.orderItems || []).length, 'payments:', (o.payments||[]).map(p=>({id:p.id,amount:p.amount,currency:p.currency})))
  })

  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
