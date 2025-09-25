// Backfill script to populate shippingPrefecture/shippingCity/shippingRest
// Usage: node scripts/backfill-shipping-fields.js
// Make sure DATABASE_URL is set in your environment (same as Prisma uses)

const { PrismaClient } = require('@prisma/client')
// Inline a minimal JS implementation of splitJapaneseAddress to avoid importing TS modules
function splitJapaneseAddress(address) {
  if (!address) return {}
  let s = address.replace(/\u3012/g, '').replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim()
  s = s.replace(/\s+/g, ' ')
  const prefRe = /(.+?[\u90fd\u9053\u5e9c\u770c])/u
  const prefMatch = s.match(prefRe)
  let prefecture
  let afterPref = s
  if (prefMatch && prefMatch[1]) {
    prefecture = prefMatch[1].trim()
    afterPref = s.slice(prefMatch.index + prefecture.length).trim()
  }
  const cityRe = /(.+?[\u5e02\u533a\u753a\u6751\u90e1])/u
  const cityMatch = afterPref.match(cityRe)
  let city
  let rest
  if (cityMatch && cityMatch[1]) {
    city = cityMatch[1].trim()
    rest = afterPref.slice(city.length).trim()
  } else {
    if (!prefecture) {
      const altCityMatch = s.match(cityRe)
      if (altCityMatch && altCityMatch[1]) {
        city = altCityMatch[1].trim()
        rest = s.slice(altCityMatch.index + city.length).trim()
      }
    } else {
      rest = afterPref || undefined
    }
  }
  return { prefecture, city, rest }
}

const prisma = new PrismaClient()

async function main() {
  console.log('Starting backfill of orders...')
  const batchSize = 200
  let offset = 0
  while (true) {
    const orders = await prisma.order.findMany({ skip: offset, take: batchSize })
    if (!orders || orders.length === 0) break
    console.log(`Processing ${orders.length} orders (offset ${offset})`)
    for (const o of orders) {
      try {
        const src = o.shippingAddress || (o.userId ? undefined : undefined)
        // If shippingAddress blank, try to load user address
        let userAddr = undefined
        if ((!src || src.trim().length === 0) && o.userId) {
          const user = await prisma.user.findUnique({ where: { id: o.userId } })
          if (user && user.address) userAddr = user.address
        }
        const parts = splitJapaneseAddress(src || userAddr || '')
        const data = {}
        if (parts.prefecture) data.shippingPrefecture = parts.prefecture
        if (parts.city) data.shippingCity = parts.city
        if (parts.rest) data.shippingRest = parts.rest
        if (Object.keys(data).length > 0) {
          await prisma.order.update({ where: { id: o.id }, data })
          console.log('Updated order', o.id, data)
        }
      } catch (e) {
        console.warn('Failed to process order', o.id, e)
      }
    }
    offset += orders.length
  }
  console.log('Backfill complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
