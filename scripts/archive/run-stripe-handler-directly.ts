import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { stripeProvider } from '../../lib/providers/stripe'

async function main() {
  const evt = await prisma.stripeEvent.findFirst({ where: { type: 'checkout.session.completed' }, orderBy: { createdAt: 'desc' } })
  if (!evt) {
    console.error('no recent stripeEvent found')
    process.exit(1)
  }
  const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload
  console.log('calling handleWebhookEvent with event id', evt.id)
  await stripeProvider.handleWebhookEvent(payload)
  console.log('done')
  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
