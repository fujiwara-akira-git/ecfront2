const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const producers = await prisma.producer.findMany({ select: { id: true, name: true }, take: 50 })
    console.log('producers:', producers)
  } catch (e) {
    console.error('error', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
