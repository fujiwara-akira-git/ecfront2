import { NextResponse } from 'next/server'
import { createDoc } from '../../../../lib/firestoreRest'

export async function POST(req: Request) {
  const body = await req.json()
  // Expect body: { productId, producerId, quantity, scheduledAt }
  if (!body || !body.productId || !body.producerId || !body.quantity || !body.scheduledAt) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const id = `ship_${Date.now().toString(36)}`
  const doc = {
    id,
    productId: body.productId,
    producerId: body.producerId,
    quantity: body.quantity,
    scheduledAt: body.scheduledAt,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  }

  try {
    await createDoc('shipments', id, doc)
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return NextResponse.json({ error: 'failed', detail: String(err) }, { status: 500 })
  }
}
