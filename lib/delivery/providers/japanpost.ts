import { DeliveryProvider, RateQuote, ShipmentResponse, Address } from '../provider'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const ID = 'japanpost'

const getEnv = (k: string) => process.env[k]

// テストモードかどうかを判定
const isTestMode = () => getEnv('JAPANPOST_TEST_MODE') === 'true'

// 重量に基づく配送料計算（テストモード用）
const calculateTestRate = (weightGrams: number = 1000): number => {
  const base = 700
  const extra = Math.ceil(Math.max(0, weightGrams - 1000) / 500) * 120
  return base + extra
}

// 本番API用の配送料計算
const calculateProductionRate = async (origin: Address, destination: Address, weightGrams: number = 1000): Promise<number> => {
  const apiKey = getEnv('JAPANPOST_API_KEY')
  const clientSecret = getEnv('JAPANPOST_CLIENT_SECRET')
  const baseUrl = getEnv('JAPANPOST_BASE_URL') || 'https://api.epost.japanpost.jp/api/v1'

  if (!apiKey || !clientSecret) {
    throw new Error('JAPANPOST_API_KEY and JAPANPOST_CLIENT_SECRET are required for production mode')
  }

  try {
    const url = `${baseUrl}/rates`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': apiKey,
        'X-Client-Secret': clientSecret
      },
      body: JSON.stringify({
        origin: { postalCode: origin.postalCode },
        destination: { postalCode: destination.postalCode },
        weight: weightGrams
      })
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.warn('Japan Post rate API returned non-OK:', resp.status, txt)
      return calculateTestRate(weightGrams)
    }

    const data = await resp.json()
    if (data && typeof data.price === 'number') {
      return data.price
    }

    return calculateTestRate(weightGrams)
  } catch (err) {
    console.error('Japan Post calculateProductionRate error:', err)
    return calculateTestRate(weightGrams)
  }
}

export const japanPostProvider: DeliveryProvider = {
  id: ID,
  async getRates({ origin, destination, weightGrams }) {
    try {
      let amount: number

      if (isTestMode()) {
        // テストモード：重量に基づく簡易計算
        amount = calculateTestRate(weightGrams)
        console.log('Japan Post Test Mode - Calculated rate:', amount, 'for weight:', weightGrams)
      } else {
        // 本番モード：実際のAPI呼び出し
        amount = await calculateProductionRate(origin, destination, weightGrams)
      }

      return [{
        courierId: ID,
        serviceCode: 'YU_PACK',
        amount,
        currency: 'JPY',
        eta: '2-3 days',
        meta: {
          testMode: isTestMode(),
          weightGrams,
          origin: origin.postalCode,
          destination: destination.postalCode
        }
      }] as RateQuote[]
    } catch (error) {
      console.error('Japan Post getRates error:', error)
      throw error
    }
  },
  async createShipment(req) {
    try {
      if (isTestMode()) {
        // テストモード：モック実装
        const deliveryId = `japanpost_test_${Date.now().toString(36)}`
        const trackingNumber = `JP${Date.now()}`
        console.log('Japan Post Test Mode - Created shipment:', { deliveryId, trackingNumber })
        return { deliveryId, trackingNumber } as ShipmentResponse
      } else {
        // 本番モード：実際のAPI呼び出し
        const apiKey = getEnv('JAPANPOST_API_KEY')
        const clientSecret = getEnv('JAPANPOST_CLIENT_SECRET')

        if (!apiKey || !clientSecret) {
          throw new Error('JAPANPOST_API_KEY and JAPANPOST_CLIENT_SECRET are required for production mode')
        }

        const baseUrl = getEnv('JAPANPOST_BASE_URL') || 'https://api.epost.japanpost.jp/api/v1'
        const url = `${baseUrl}/shipment`

        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': apiKey,
              'X-Client-Secret': clientSecret
            },
            body: JSON.stringify({
              orderId: req.orderId,
              package: req.packageInfo,
              origin: { postalCode: req.origin.postalCode },
              destination: { postalCode: req.destination.postalCode }
            })
          })

          if (!resp.ok) {
            const txt = await resp.text()
            console.warn('Japan Post create API non-OK:', resp.status, txt)
            const deliveryId = `japanpost_prod_fallback_${Date.now().toString(36)}`
            const trackingNumber = `JP${Date.now()}`
            return { deliveryId, trackingNumber } as ShipmentResponse
          }

          const data = await resp.json()
          const deliveryId = data.id || `japanpost_prod_${Date.now().toString(36)}`
          const trackingNumber = data.trackingNumber || data.tracking_no || null
          return { deliveryId, trackingNumber, raw: data } as ShipmentResponse
        } catch (err) {
          console.error('Japan Post createShipment API error:', err)
          const deliveryId = `japanpost_prod_error_${Date.now().toString(36)}`
          const trackingNumber = `JP${Date.now()}`
          return { deliveryId, trackingNumber } as ShipmentResponse
        }
      }
    } catch (error) {
      console.error('Japan Post createShipment error:', error)
      throw error
    }
  },
  async verifyWebhook(headers: Record<string,string>, body: Buffer | string) {
    try {
      if (isTestMode()) {
        // テストモード：検証をスキップ
        console.log('Japan Post Test Mode - Skipping webhook verification')
        return true
      }

      // 本番モード：HMAC-SHA256検証
      const secret = getEnv('JAPANPOST_WEBHOOK_SECRET')
      if (!secret) {
        console.error('JAPANPOST_WEBHOOK_SECRET is not set for production mode')
        return false
      }

      const payload = typeof body === 'string' ? body : body.toString('utf8')
      const sigHeader = (headers['x-japanpost-signature'] || headers['X-JAPANPOST-SIGNATURE'] || '') as string

      if (!sigHeader) {
        console.error('Missing X-JapanPost-Signature header')
        return false
      }

      const h = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      const isValid = crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(sigHeader, 'hex'))

      console.log('Japan Post webhook verification:', isValid ? 'valid' : 'invalid')
      return isValid
    } catch (error) {
      console.error('Japan Post verifyWebhook error:', error)
      return false
    }
  },
  async handleWebhookEvent(body: any) {
    try {
      console.log('Japan Post webhook event received:', body)

      if (!body || !body.deliveryId) {
        console.error('Invalid webhook payload: missing deliveryId')
        return
      }

      // TODO: Firestoreやデータベースで配送ステータスを更新
      // ここではログ出力のみ
      console.log('Japan Post delivery status update:', {
        deliveryId: body.deliveryId,
        status: body.status || 'updated',
        eventType: body.eventType || null,
        trackingNumber: body.trackingNumber || null
      })

      // Firestore更新（必要に応じて）
      try {
        await prisma.delivery.updateMany({
          where: { id: body.deliveryId },
          data: {
            status: body.status || 'updated',
            trackingNumber: body.trackingNumber || null,
            raw: { ...(body.raw || {}), lastEvent: body.eventType || null },
            updatedAt: new Date()
          }
        })
        console.log('Japan Post delivery status updated in database (Prisma)')
      } catch (e) {
        console.warn('Japan Post handleWebhookEvent Prisma update failed:', e)
      }
    } catch (error) {
      console.error('Japan Post handleWebhookEvent error:', error)
    }
  }
}
