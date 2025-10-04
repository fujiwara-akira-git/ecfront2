#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function processOnce() {
  const events = await prisma.stripeEvent.findMany({ where: { type: 'checkout.session.completed' }, orderBy: { createdAt: 'desc' }, take: 10 })
  console.log('found events:', events.length)
  for (const ev of events) {
    let payload = ev.payload
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload) } catch (e) { console.warn('payload parse err', e); continue }
    }
    const session = payload?.data?.object || payload
    const existingOrderId = session?.metadata?.orderId || payload?.data?.object?.metadata?.orderId
    if (!existingOrderId) {
      console.log('event', ev.id, 'has no metadata.orderId, skipping')
      continue
    }
    const order = await prisma.order.findUnique({ where: { id: existingOrderId }, include: { orderItems: true } })
    if (!order) {
      console.log('order not found for id', existingOrderId)
      continue
    }
    console.log('order found', order.id, 'itemCount=', order.orderItems.length)
    if (order.orderItems && order.orderItems.length > 0) {
      console.log('already has items, skipping')
      continue
    }
    // try to extract line_items from payload (may not be expanded)
    const rawLineItems = (session && session.line_items && Array.isArray(session.line_items.data)) ? session.line_items.data : (session && session.line_items && session.line_items.data ? session.line_items.data : [])
    if (!rawLineItems || rawLineItems.length === 0) {
      console.log('no line_items in event payload for', ev.id)
      continue
    }
    const itemsToCreate = rawLineItems.map((li) => {
      const qty = li.quantity || 1
      const unitAmount = (li.price && typeof li.price === 'object' && typeof li.price.unit_amount === 'number') ? li.price.unit_amount : (li.amount_subtotal || li.amount || 0)
      let prodId = undefined
      try {
        if (li.price && typeof li.price === 'object') {
          const p = li.price
          if (p.metadata && (p.metadata.productId || p.metadata.product_id || p.metadata.sku)) {
            prodId = p.metadata.productId || p.metadata.product_id || p.metadata.sku
          }
          if (!prodId && p.product && typeof p.product === 'string') prodId = p.product
        }
  } catch (e) { console.warn('extract prodId err', e) }
      if (!prodId) prodId = li.description || `stripe_lineitem_${li.id}`
      return {
        orderId: order.id,
        productId: String(prodId),
        quantity: qty,
        unitPrice: Math.round(unitAmount || 0),
        totalPrice: Math.round((unitAmount || 0) * qty)
      }
    })
    try {
      const res = await prisma.orderItem.createMany({ data: itemsToCreate })
      console.log('created items for order', order.id, 'count:', itemsToCreate.length, 'result:', res)
    } catch (e) {
      console.error('failed to create items for order', order.id, e)
    }
  }
}

processOnce().then(()=>{ prisma.$disconnect(); console.log('done') }).catch(e=>{ console.error(e); prisma.$disconnect(); process.exit(1) })
