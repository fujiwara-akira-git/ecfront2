(async () => {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const id = 'c7a46740-a3b4-4405-b9d4-78054a76dd32'
    const p = await prisma.product.findUnique({ where: { id }, include: { producer: true, inventory: true } })
    console.log(JSON.stringify(p, null, 2))
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
