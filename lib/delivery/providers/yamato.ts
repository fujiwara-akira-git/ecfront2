import { DeliveryProvider, RateQuote, ShipmentResponse } from '../provider'
import crypto from 'crypto'

const ID = 'yamato'

const getEnv = (k: string) => process.env[k]

export const yamatoProvider: DeliveryProvider = {
  id: ID,
  async getRates() {
    // Emulated implementation: production should call Yamato B2 rate endpoint
    // Use simple heuristic for demo: base 600 + weight band
    const base = 600
  const weight = 1000
    const extra = Math.ceil(Math.max(0, weight - 1000) / 500) * 100
    return [ { courierId: ID, serviceCode: 'TA-Q-BIN', amount: base + extra, currency: 'JPY', eta: '1-2 days' } ] as RateQuote[]
  },
  async createShipment() {
    // Emulated creation: in prod call B2 create API and return tracking number
    const deliveryId = `yamato_${Date.now().toString(36)}`
    const trackingNumber = `YMT${Date.now()}`
    // Optionally: call external API here using getEnv('YAMATO_API_KEY')
    return { deliveryId, trackingNumber } as ShipmentResponse
  },
  async verifyWebhook(headers: Record<string,string>, body: Buffer | string) {
    // Simple HMAC-SHA256 verification using YAMATO_WEBHOOK_SECRET
    const secret = getEnv('YAMATO_WEBHOOK_SECRET')
    if (!secret) return false
    const payload = typeof body === 'string' ? body : body.toString('utf8')
  const sigHeader = (headers['x-yamato-signature'] || headers['X-YAMATO-SIGNATURE'] || '') as string
    if (!sigHeader) return false
    const h = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(sigHeader, 'hex'))
  },
  async handleWebhookEvent(body: any) {
    // Minimal: expect { deliveryId, eventType, trackingNumber, status }
    const ev = body
    if (!ev || !ev.deliveryId) return
    // Update Firestore delivery status (lazy import to avoid heavy deps in provider file)
    try {
      const { patchDoc } = await import('../../firestoreRest')
      await patchDoc('deliveries', ev.deliveryId, { status: ev.status || 'updated', lastEvent: ev.eventType || null, trackingNumber: ev.trackingNumber || null, updatedAt: new Date().toISOString() })
    } catch (e) {
      console.warn('yamato handleWebhookEvent failed', e)
    }
  }
}
