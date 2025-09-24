#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const EVT = process.argv[2]
if (!EVT) { console.error('usage: node check-stripe-event-processed.js <eventId>'); process.exit(2) }
(async ()=>{
  const e = await p.stripeEvent.findUnique({ where: { id: EVT } })
  if (!e) { console.log('event not found:', EVT); process.exit(0) }
  console.log('id:', e.id, 'type:', e.type, 'processed:', e.processed, 'processedAt:', e.processedAt)
  await p.$disconnect()
})()
