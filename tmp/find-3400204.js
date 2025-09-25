const { PrismaClient } = require('@prisma/client')
;(async () => {
  const p = new PrismaClient()
  try {
    const os = await p.order.findMany({ where: { postalCode: '3400204' } })
    console.log('found', os.length)
    console.log(JSON.stringify(os.map(o => ({ id: o.id, shippingAddress: o.shippingAddress, shippingPrefecture: o.shippingPrefecture, shippingCity: o.shippingCity, shippingRest: o.shippingRest, postalCode: o.postalCode, notes: o.notes })), null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    await p.$disconnect()
  }
})()
