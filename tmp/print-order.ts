import { prisma } from '@/lib/prisma'

async function main() {
  try {
    const o = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } })
    console.log('latest order:', JSON.stringify(o, null, 2))
  } catch (e) {
    console.error('error fetching order:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
