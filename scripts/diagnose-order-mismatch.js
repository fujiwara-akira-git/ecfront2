#!/usr/bin/env node
// Diagnose mismatches between DB orderItems and Stripe session.line_items
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
let stripe = null
let Stripe = null
try {
  Stripe = require('stripe')
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-08-27.basil' })
  } else {
    console.warn('No STRIPE_SECRET_KEY configured — skipping live Stripe retrievals, only DB will be inspected')
  }
} catch (e) {
  console.warn('stripe package not available or failed to initialize — skipping live Stripe retrievals')
}

async function main() {
  const recent = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { orderItems: { include: { product: true } }, payments: true } })
  for (const o of recent) {
    const notes = o.notes || ''
    const m = (notes || '').match(/Stripe Session ID:\s*([A-Za-z0-9_-]+)/)
    if (!m) continue
    const sessionId = m[1]
    console.log('ORDER', o.id, 'currency', o.currency, 'total', o.totalAmount, 'sessionId', sessionId)
    try {
      let liData = []
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items', 'line_items.data.price'] })
        liData = (session.line_items && session.line_items.data) || []
        console.log(' stripe line_items count=', liData.length)
        liData.forEach((li, idx) => {
          const desc = li.description
          const qty = li.quantity
          const unit = li.price && li.price.unit_amount ? li.price.unit_amount : (li.amount_subtotal || li.amount || null)
          console.log(`  [stripe] item ${idx}: desc="${desc}" qty=${qty} unit=${unit} priceId=${li.price && (li.price.id||li.price.product)}`)
        })
      } else {
        console.log(' stripe: skipped (no stripe client)')
      }
      // compare with DB orderItems
      if (o.orderItems && o.orderItems.length>0) {
        o.orderItems.forEach((it, idx) => {
          console.log(`  [db] item ${idx}: productName="${it.product ? it.product.name : 'NULL'}" productId=${it.productId} qty=${it.quantity} unitPrice=${it.unitPrice} totalPrice=${it.totalPrice}`)
        })
      } else {
        console.log('  [db] no orderItems')
      }
      // simple comparison heuristics
      if (liData.length !== (o.orderItems ? o.orderItems.length : 0)) {
        console.log('  -> MISMATCH: line_item count differs vs db orderItems length')
      } else {
        // per-item compare by index
        for (let i=0;i<liData.length;i++) {
          const li = liData[i]
          const dbIt = o.orderItems[i]
          const liUnit = li.price && li.price.unit_amount ? li.price.unit_amount : (li.amount_subtotal || li.amount || 0)
          if (Math.round(liUnit) !== Math.round(dbIt.unitPrice)) {
            console.log(`  -> MISMATCH unitPrice on item ${i}: stripe ${liUnit} vs db ${dbIt.unitPrice}`)
          }
          if ((li.quantity||1) !== (dbIt.quantity||1)) {
            console.log(`  -> MISMATCH quantity on item ${i}: stripe ${li.quantity} vs db ${dbIt.quantity}`)
          }
          const liTotal = Math.round((liUnit||0) * (li.quantity||1))
          if (liTotal !== Math.round(dbIt.totalPrice)) {
            console.log(`  -> MISMATCH totalPrice on item ${i}: stripe ${liTotal} vs db ${dbIt.totalPrice}`)
          }
          const liDesc = li.description || (li.price && li.price.product) || ''
          const dbName = dbIt.product ? dbIt.product.name : ''
          if (liDesc && dbName && !dbName.includes(liDesc) && !liDesc.includes(dbName)) {
            console.log(`  -> POSSIBLE NAME MISMATCH on item ${i}: stripe desc="${liDesc}" vs db name="${dbName}"`)
          }
        }
      }
    } catch (e) {
      console.warn(' failed to retrieve stripe session for order', o.id, e.message)
    }
    console.log('---')
  }
  await prisma.$disconnect()
}

main().catch(e=>{console.error(e); process.exit(1)})
