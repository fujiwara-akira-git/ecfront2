const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sessionId = process.argv[2]
  if (!sessionId) {
    console.error('Usage: node tmp/find-order-by-session.js <sessionId>')
    process.exit(2)
  }

  try {
    const o = await prisma.order.findFirst({ where: { notes: { contains: sessionId } } })
    if (!o) {
      console.log('order not found for session id:', sessionId)
    } else {
      console.log('order found:', JSON.stringify(o, null, 2))
    }
  } catch (e) {
    console.error('error fetching order:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
