const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Small postal -> area map (kept in sync with lib/address.ts POSTAL_TO_AREA)
const POSTAL_TO_AREA = {
  '3400203': { prefecture: '埼玉県', city: '久喜市' },
  '1040061': { prefecture: '東京都', city: '中央区' },
  '3400204': { prefecture: '埼玉県', city: '久喜市' },
  '3400205': { prefecture: '埼玉県', city: '久喜市' },
  '3400202': { prefecture: '埼玉県', city: '久喜市' }
}

function lookupAreaFromPostal(postal) {
  if (!postal) return undefined
  const raw = String(postal).replace(/[^0-9]/g, '')
  if (raw.length >= 7) {
    const seven = raw.slice(0, 7)
    if (POSTAL_TO_AREA[seven]) return POSTAL_TO_AREA[seven]
  }
  const three = raw.slice(0, 3)
  if (POSTAL_TO_AREA[three]) return POSTAL_TO_AREA[three]
  return undefined
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node tmp/set-order-address-from-postal.js <sessionId|orderId>')
    process.exit(2)
  }

  try {
    // Try find by exact id first
    let order = null
    order = await prisma.order.findUnique({ where: { id: arg } })
    if (!order) {
      // find by notes containing session id
      order = await prisma.order.findFirst({ where: { notes: { contains: arg } } })
    }
    if (!order) {
      console.log('Order not found for:', arg)
      process.exit(0)
    }

    console.log('Found order:', order.id, 'shippingAddress:', order.shippingAddress, 'postalCode:', order.postalCode)
    const postal = order.postalCode || order.postal || null
    const area = lookupAreaFromPostal(postal)
    const prefecture = area ? area.prefecture : undefined
    const city = area ? area.city : undefined
    // As a best-effort, use shippingAddress as rest (if it doesn't already contain prefecture/city)
    const rest = order.shippingAddress || ''

    const data = {}
    if (prefecture) data.shippingPrefecture = prefecture
    if (city) data.shippingCity = city
    if (rest) data.shippingRest = rest

    const updated = await prisma.order.update({ where: { id: order.id }, data })
    console.log('Order updated:', { id: updated.id, shippingPrefecture: updated.shippingPrefecture, shippingCity: updated.shippingCity, shippingRest: updated.shippingRest })
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
