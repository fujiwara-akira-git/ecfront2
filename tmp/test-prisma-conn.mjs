import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Connecting via Prisma...')
    const res = await prisma.$queryRaw`SELECT 1 as v`
    console.log('Query result:', res)
  } catch (err) {
    console.error('Prisma runtime error:', err)
  } finally {
    await prisma.$disconnect().catch(()=>{})
  }
}

main()
