#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: node replace-placeholder.js <placeholderProductId> <targetProductId> [--remove-placeholder]')
    process.exit(1)
  }
  const [placeholderId, targetId] = args
  const removePlaceholder = args.includes('--remove-placeholder')

  console.log('Replacing orderItems referencing', placeholderId, 'with', targetId)
  // Update orderItems
  const update = await prisma.orderItem.updateMany({ where: { productId: placeholderId }, data: { productId: targetId } })
  console.log('Updated orderItems count:', update.count)

  // Optionally remove placeholder product if no longer referenced
  if (removePlaceholder) {
    const refs = await prisma.orderItem.count({ where: { productId: placeholderId } })
    if (refs === 0) {
      await prisma.product.delete({ where: { id: placeholderId } })
      console.log('Placeholder product deleted:', placeholderId)
    } else {
      console.log('Placeholder still referenced, not deleting. refs:', refs)
    }
  }

  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
