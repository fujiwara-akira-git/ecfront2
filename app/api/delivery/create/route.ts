import { NextResponse } from 'next/server'
import { yamatoProvider } from '../../../../lib/delivery/providers/yamato'
import { japanPostProvider } from '../../../../lib/delivery/providers/japanpost'
import { createDoc } from '../../../../lib/firestoreRest'
import { prisma } from '../../../../lib/prisma'
import { DeliveryProvider } from '../../../../lib/delivery/provider'
import { Prisma } from '@prisma/client'

const providerMap: Record<string, DeliveryProvider> = { yamato: yamatoProvider, japanpost: japanPostProvider }

export async function POST(req: Request) {
  const body = await req.json()
  const { courierId, serviceCode, origin, destination, packageInfo, orderId } = body
  if (!courierId || !serviceCode || !origin || !destination) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

  const provider = providerMap[courierId]
  if (!provider) return NextResponse.json({ error: 'unsupported provider' }, { status: 400 })

  try {
    const resp = await provider.createShipment({ orderId, packageInfo, origin, destination, serviceCode })
    const deliveryId = resp.deliveryId

    if (process.env.DATABASE_URL) {
      // Persist to Postgres via Prisma (Neon)
      const created = await prisma.delivery.create({
        data: {
          id: deliveryId,
          orderId: orderId || null,
          courierId,
          serviceCode,
          trackingNumber: resp.trackingNumber || null,
          status: 'pending',
          raw: resp.raw ? (resp.raw as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      })
      return NextResponse.json({ ok: true, deliveryId: created.id, trackingNumber: created.trackingNumber })
    } else {
      // Fallback to Firestore emulator via REST helper
      await createDoc('deliveries', deliveryId, { id: deliveryId, orderId: orderId || null, courierId, serviceCode, trackingNumber: resp.trackingNumber, status: 'pending', createdAt: new Date().toISOString() })
      return NextResponse.json({ ok: true, deliveryId, trackingNumber: resp.trackingNumber })
    }
  } catch (err) {
    return NextResponse.json({ error: 'create shipment failed', detail: String(err) }, { status: 500 })
  }
}
