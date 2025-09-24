#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async ()=>{
  const e = await p.stripeEvent.findFirst({ where: { type: 'checkout.session.completed' }, orderBy: { createdAt: 'desc' } })
  if (!e) { console.log('no event'); process.exit(0) }
  let payload = e.payload
  try { payload = typeof payload === 'string' ? JSON.parse(payload) : payload } catch(e){}
  console.log('event id:', e.id)
  console.log(JSON.stringify(payload, null, 2))
  await p.$disconnect()
})()
