const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: node tmp/print-order-by-id.js <orderId>')
    process.exit(2)
  }

  try {
    const o = await prisma.order.findUnique({ where: { id } })
    if (!o) {
      console.log('order not found for id:', id)
    } else {
      console.log('order:', JSON.stringify(o, null, 2))
    }
  } catch (e) {
    console.error('error fetching order:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
