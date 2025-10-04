#!/usr/bin/env node
/**
 * Safe deletion script: delete Products containing 'myproduct' (case-insensitive)
 * Usage: DATABASE_URL=... node scripts/delete-myproduct-products.js
 * Output: tmp/delete-myproduct-results.jsonl
 */
const path = require('path')
const fs = require('fs')

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-n')
  const confirm = args.includes('--confirm') || args.includes('-y')

  if (!process.env.DATABASE_URL) {
    console.error('Please set DATABASE_URL in env before running this script.')
    process.exit(2)
  }
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  const outPath = path.resolve(process.cwd(), 'tmp/delete-myproduct-results.jsonl')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const q = {
    where: {
      name: {
        contains: 'myproduct',
        mode: 'insensitive',
      },
    },
  }

  const matches = await prisma.product.findMany({ ...q, select: { id: true, name: true } })
  const total = matches.length
  if (total === 0) {
    console.log('No products found matching "myproduct"')
    fs.writeFileSync(outPath, JSON.stringify({ ts: new Date().toISOString(), deleted: 0 }) + '\n')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`Found ${total} product(s) to delete.`)

  if (dryRun) {
    console.log('Dry-run mode: listing matches without deleting:')
    for (const p of matches) console.log(p.id, p.name)
    fs.writeFileSync(outPath, JSON.stringify({ ts: new Date().toISOString(), found: total, dryRun: true }) + '\n')
    await prisma.$disconnect()
    process.exit(0)
  }

  if (!confirm) {
    console.log('No --confirm flag provided. To perform deletion, re-run with --confirm (or -y).')
    await prisma.$disconnect()
    process.exit(3)
  }

  const results = []
  for (const p of matches) {
    try {
      // delete related Inventory if exists (onDelete Cascade might handle, but ensure cleanup)
      await prisma.inventory.deleteMany({ where: { productId: p.id } })
      // delete cart items
      await prisma.cartItem.deleteMany({ where: { productId: p.id } })
      // delete order items (note: this will fail if orderItem has FK constraints preventing delete)
      await prisma.orderItem.deleteMany({ where: { productId: p.id } })

      // finally delete product
      await prisma.product.delete({ where: { id: p.id } })
      results.push({ id: p.id, name: p.name, status: 'deleted' })
      console.log('deleted product', p.id, p.name)
    } catch (err) {
      console.error('failed to delete product', p.id, err)
      results.push({ id: p.id, name: p.name, status: 'failed', error: String(err) })
    }
  }

  // write results
  for (const r of results) fs.appendFileSync(outPath, JSON.stringify(Object.assign({ ts: new Date().toISOString() }, r)) + '\n')
  console.log(`Wrote ${results.length} results to ${outPath}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
