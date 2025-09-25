// Fill shippingRest (and prefecture/city when missing) from shippingAddress + small postal map
// Usage: node scripts/fill-shipping-rest-from-address.js [postalCode]

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const POSTAL_TO_AREA = {
  '3400203': { prefecture: '埼玉県', city: '久喜市' },
  '1040061': { prefecture: '東京都', city: '中央区' },
  '3400204': { prefecture: '埼玉県', city: '久喜市' },
}

function lookupArea(postal) {
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
  const targetPostal = process.argv[2] || '1040061'
  console.log('Starting targeted fill: shippingRest from shippingAddress where missing for postal', targetPostal)
  const orders = await prisma.order.findMany({ where: { postalCode: targetPostal } })
  console.log('Found', orders.length, 'orders with postal', targetPostal)
  for (const o of orders) {
    try {
      const updates = {}
      if ((!o.shippingPrefecture || !o.shippingCity) && o.postalCode) {
        const area = lookupArea(o.postalCode)
        if (area) {
          if (area.prefecture && !o.shippingPrefecture) updates.shippingPrefecture = area.prefecture
          if (area.city && !o.shippingCity) updates.shippingCity = area.city
        }
      }
      if ((!o.shippingRest || o.shippingRest.trim().length === 0) && o.shippingAddress) {
        updates.shippingRest = o.shippingAddress
      }
      if (Object.keys(updates).length > 0) {
        await prisma.order.update({ where: { id: o.id }, data: updates })
        console.log('Updated', o.id, updates)
      } else {
        console.log('No update needed for', o.id)
      }
    } catch (e) {
      console.warn('Failed to update', o.id, e)
    }
  }
  console.log('Done')
}

main().catch(e=>{console.error(e); process.exit(1)}).finally(async()=>{await prisma.$disconnect()})
