#!/usr/bin/env node
const {PrismaClient} = require('@prisma/client')
const p = new PrismaClient()
const sid = process.argv[2]
if (!sid) { console.error('usage: node find-order-by-session.js <sessionId>'); process.exit(2) }
(async ()=>{
  try {
    const orders = await p.order.findMany({ where: { notes: { contains: sid } }, include: { orderItems: true, payments: true } })
    console.log('orders matching notes:', orders.length)
    for (const o of orders) {
      console.log('ORDER', { id: o.id, totalAmount: o.totalAmount, currency: o.currency, status: o.status, items: o.orderItems.length, payments: o.payments.length, notes: o.notes })
      if (o.orderItems.length > 0) console.log(' sample item:', o.orderItems[0])
      if (o.payments.length > 0) console.log(' sample payment:', o.payments[0])
    }

    // also try payments referencing stripe id via payment.stripeId equal to paymentIntent
    const pmt = await p.payment.findMany({ where: { stripeId: { contains: 'pi_3S932VJq9qYoN0en08F5PzPC' } }, include: { order: true } })
    console.log('payments referencing pi:', pmt.length)
    for (const pm of pmt) {
      console.log('PM', { id: pm.id, orderId: pm.orderId, stripeId: pm.stripeId, amount: pm.amount })
    }
  } catch (e) {
    console.error(e)
  } finally {
    await p.$disconnect()
  }
})()
