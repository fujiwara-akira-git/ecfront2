import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  console.log('Using DATABASE_URL=', process.env.DATABASE_URL ? '[REDACTED]' : 'undefined')
  const prisma = new PrismaClient()
  try {
    const events = await prisma.stripeEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    console.log('Recent stripeEvent:')
    for (const e of events) {
      console.log('-', e.id, e.type, 'processed=', e.processed, 'createdAt=', e.createdAt)
    }

    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    console.log('\nRecent orders:')
    for (const o of orders) {
      console.log('-', o.id, o.status, 'total=', o.totalAmount, 'customerEmail=', o.customerEmail)
    }

    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    console.log('\nRecent payments:')
    for (const p of payments) {
      console.log('-', p.id, 'stripeId=', p.stripeId, 'amount=', p.amount, 'orderId=', p.orderId)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e)=>{console.error(e); process.exit(1)})
