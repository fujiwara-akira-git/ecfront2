#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  const stripeId = process.argv[2] || 'pi_3S932VJq9qYoN0en08F5PzPC'
  const rows = await prisma.payment.findMany({ where: { stripeId }, orderBy: { createdAt: 'asc' } })
  console.log(JSON.stringify(rows.map(r=>({ id: r.id, orderId: r.orderId, createdAt: r.createdAt })), null, 2))
  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
