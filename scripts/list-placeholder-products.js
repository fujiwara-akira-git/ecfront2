#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const placeholders = await prisma.product.findMany({ where: { description: { contains: 'imported_from_stripe' } }, orderBy: { createdAt: 'desc' }, take: 200 })
  if (placeholders.length === 0) {
    console.log('No placeholder products found')
    process.exit(0)
  }
  console.log('Placeholder products (imported_from_stripe):')
  placeholders.forEach(p => {
    console.log('-', p.id, p.name, 'price:', p.price, 'desc:', p.description)
  })
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
