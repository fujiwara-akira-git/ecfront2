#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('DATABASE_URL=', !!process.env.DATABASE_URL)
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { orderItems: true, payments: true }
  })
  console.log('Recent orders:')
  for (const o of orders) {
    console.log('---')
    console.log('id:', o.id)
    console.log('status:', o.status, 'totalAmount:', o.totalAmount, 'currency:', o.currency)
    console.log('items count:', (o.orderItems || []).length)
    if (o.orderItems && o.orderItems.length > 0) {
      for (const it of o.orderItems) {
        console.log('  item:', { productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, totalPrice: it.totalPrice })
      }
    }
    console.log('payments:', (o.payments || []).map(p => ({ id: p.id, amount: p.amount, currency: p.currency })))
  }

  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log('\nRecent payments:')
  payments.forEach(p => console.log({ id: p.id, orderId: p.orderId, amount: p.amount, currency: p.currency }))

  const stripeEvents = await prisma.stripeEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log('\nRecent stripe events:')
  stripeEvents.forEach(e => console.log({ id: e.id, type: e.type, processed: e.processed }))

  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
