#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  const sessionId = process.argv[2] || 'cs_test_a1lqgIeHNSztdCQYtNNHEWF9kUlKs3PTkT6jMDm60NjfIofycQO8vd05Rq'
  const rows = await prisma.order.findMany({ where: { notes: { contains: sessionId } }, include: { orderItems: true, payments: true }, orderBy: { createdAt: 'asc' } })
  console.log('orders for session:', JSON.stringify(rows.map(r=>({ id: r.id, createdAt: r.createdAt, items: r.orderItems.length, payments: r.payments.map(p=>p.stripeId) })), null, 2))
  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
