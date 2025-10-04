// Backfill postal-based area mapping for orders with missing shippingPrefecture/shippingCity
// Usage: node scripts/backfill-shipping-by-postal.js
// Make sure DATABASE_URL is set in your environment

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const POSTAL_TO_AREA = {
  '3400203': { prefecture: '埼玉県', city: '久喜市' }, // 桜田
  '1040061': { prefecture: '東京都', city: '中央区' }, // 銀座
}

function lookupAreaFromPostalRaw(postal) {
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
  console.log('Starting postal-based backfill...')
  const batchSize = 200
  let offset = 0
  while (true) {
    const orders = await prisma.order.findMany({ skip: offset, take: batchSize, orderBy: { createdAt: 'asc' } })
    if (!orders || orders.length === 0) break
    console.log(`Processing ${orders.length} orders (offset ${offset})`)
    for (const o of orders) {
      try {
        if ((!o.shippingPrefecture || !o.shippingCity) && o.postalCode) {
          const area = lookupAreaFromPostalRaw(o.postalCode)
          if (area && (area.prefecture || area.city)) {
            const data = {}
            if (area.prefecture && !o.shippingPrefecture) data.shippingPrefecture = area.prefecture
            if (area.city && !o.shippingCity) data.shippingCity = area.city
            if (Object.keys(data).length > 0) {
              await prisma.order.update({ where: { id: o.id }, data })
              console.log('Updated order', o.id, data)
            }
          }
        }
      } catch (e) {
        console.warn('Failed to process order', o.id, e)
      }
    }
    offset += orders.length
  }
  console.log('Postal-based backfill complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
