const { PrismaClient } = require('@prisma/client')

(async () => {
  const prisma = new PrismaClient()
  try {
    console.log('Connecting...')
    const res = await prisma.$queryRaw`SELECT 1 as v`
    console.log('Query result:', res)
  } catch (err) {
    console.error('Prisma runtime error:', err)
  } finally {
    try { await prisma.$disconnect() } catch(e) { }
  }
})()
