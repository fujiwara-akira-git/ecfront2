const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    const id = 'a1d1c776-b090-4bbc-8871-e13cb2367ef1'
    const pro = await prisma.producer.findUnique({ where: { id }, include: { products: { take: 50 } } })
    if (!pro) return console.log('producer not found')
    console.log(JSON.stringify(pro.products.map(p => ({ id: p.id, name: p.name, image: p.image })), null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
})()
