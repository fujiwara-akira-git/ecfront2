const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const o = await prisma.order.findUnique({ where: { id: '5ddc01ee-d856-46c3-8b06-e365f575191d' } })
    console.log('order:', JSON.stringify(o, null, 2))
  } catch (e) {
    console.error('error fetching order:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
