#!/usr/bin/env node
const {PrismaClient} = require('@prisma/client')
const p = new PrismaClient()
const id = process.argv[2]
if (!id) { console.error('usage: node show-order.js <orderId>'); process.exit(2) }
(async ()=>{
  try {
    const o = await p.order.findUnique({ where: { id }, include: { orderItems: true, payments: true } })
    if (!o) { console.log('order not found:', id); process.exit(0) }
    console.log('ORDER', { id: o.id, totalAmount: o.totalAmount, currency: o.currency, status: o.status, items: o.orderItems.length, payments: o.payments.length })
    console.log(JSON.stringify(o.orderItems, null, 2))
  } catch (e) { console.error(e) }
  await p.$disconnect()
})()
