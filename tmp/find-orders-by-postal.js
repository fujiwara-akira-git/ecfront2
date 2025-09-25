const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    const orders = await prisma.order.findMany({ where: { postalCode: '1040061' } })
    console.log('Found', orders.length, 'orders with postalCode 1040061')
    for (const o of orders) {
      console.log(JSON.stringify({ id: o.id, customerName: o.customerName, shippingAddress: o.shippingAddress, shippingPrefecture: o.shippingPrefecture, shippingCity: o.shippingCity, shippingRest: o.shippingRest, postalCode: o.postalCode, notes: o.notes }, null, 2))
    }
  } catch (e) {
    console.error('error', e)
  } finally {
    await prisma.$disconnect()
  }
})()
