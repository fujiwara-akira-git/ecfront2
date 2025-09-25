/* Quick script to find orders matching postal code 3400203 or customer email customer20@example.com
   Prints id, customerEmail, customerName, shippingAddress, postalCode, shippingPrefecture, shippingCity, shippingRest, notes
*/
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const postal = '3400203'
  const email = 'customer20@example.com'
  const orders = await prisma.order.findMany({ where: { OR: [{ postalCode: postal }, { customerEmail: email }, { shippingAddress: { contains: '桜田' } }] }, take: 50 })
  if (!orders || orders.length === 0) {
    console.log('No orders found matching postal or email')
    return
  }
  for (const o of orders) {
    console.log(JSON.stringify({ id: o.id, customerEmail: o.customerEmail, customerName: o.customerName, shippingAddress: o.shippingAddress, postalCode: o.postalCode, shippingPrefecture: o.shippingPrefecture, shippingCity: o.shippingCity, shippingRest: o.shippingRest, notes: o.notes }, null, 2))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
