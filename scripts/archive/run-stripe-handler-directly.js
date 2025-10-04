#!/usr/bin/env node
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
// load prisma client env and node path
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const provider = require('../lib/providers/stripe').stripeProvider

async function main() {
  // pick a recent stored stripeEvent payload
  const evt = await prisma.stripeEvent.findFirst({ where: { type: 'checkout.session.completed' }, orderBy: { createdAt: 'desc' } })
  if (!evt) {
    console.error('no recent stripeEvent found')
    process.exit(1)
  }
  const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload
  console.log('calling handleWebhookEvent with event id', evt.id)
  await provider.handleWebhookEvent(payload)
  console.log('done')
  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
