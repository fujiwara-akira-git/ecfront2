import { DeliveryProvider, RateQuote, ShipmentResponse, Address } from '../provider'
import crypto from 'crypto'

const ID = 'yamato'

const getEnv = (k: string) => process.env[k]

// テストモードかどうかを判定
const isTestMode = () => getEnv('YAMATO_TEST_MODE') === 'true'

// 重量に基づく配送料計算（テストモード用）
const calculateTestRate = (weightGrams: number = 1000): number => {
  const base = 600
  const extra = Math.ceil(Math.max(0, weightGrams - 1000) / 500) * 100
  return base + extra
}

// 本番API用の配送料計算
const calculateProductionRate = async (origin: Address, destination: Address, weightGrams: number = 1000): Promise<number> => {
  const apiKey = getEnv('YAMATO_API_KEY')
  if (!apiKey) {
    throw new Error('YAMATO_API_KEY is required for production mode')
  }

  // TODO: 実際のヤマトB2 APIを呼び出す
  // ここではテストモードと同じ計算を返す（本番API実装時は置き換え）
  console.log('Yamato Production API call would be made here with:', {
    origin,
    destination,
    weightGrams,
    apiKey: apiKey.substring(0, 8) + '...'
  })

  return calculateTestRate(weightGrams)
}

export const yamatoProvider: DeliveryProvider = {
  id: ID,
  async getRates({ origin, destination, weightGrams }) {
    try {
      let amount: number

      if (isTestMode()) {
        // テストモード：重量に基づく簡易計算
        amount = calculateTestRate(weightGrams)
        console.log('Yamato Test Mode - Calculated rate:', amount, 'for weight:', weightGrams)
      } else {
        // 本番モード：実際のAPI呼び出し
        amount = await calculateProductionRate(origin, destination, weightGrams)
      }

      return [{
        courierId: ID,
        serviceCode: 'TA-Q-BIN',
        amount,
        currency: 'JPY',
        eta: '1-2 days',
        meta: {
          testMode: isTestMode(),
          weightGrams,
          origin: origin.postalCode,
          destination: destination.postalCode
        }
      }] as RateQuote[]
    } catch (error) {
      console.error('Yamato getRates error:', error)
      throw error
    }
  },
  async createShipment(req) {
    try {
      if (isTestMode()) {
        // テストモード：モック実装
        const deliveryId = `yamato_test_${Date.now().toString(36)}`
        const trackingNumber = `YMT${Date.now()}`
        console.log('Yamato Test Mode - Created shipment:', { deliveryId, trackingNumber })
        return { deliveryId, trackingNumber } as ShipmentResponse
      } else {
        // 本番モード：実際のAPI呼び出し
        const apiKey = getEnv('YAMATO_API_KEY')
        if (!apiKey) {
          throw new Error('YAMATO_API_KEY is required for production mode')
        }

        // TODO: 実際のヤマトB2 APIを呼び出して配送を作成
        console.log('Yamato Production API call would create shipment with:', {
          orderId: req.orderId,
          weight: req.packageInfo.weightGrams,
          origin: req.origin.postalCode,
          destination: req.destination.postalCode,
          apiKey: apiKey.substring(0, 8) + '...'
        })

        const deliveryId = `yamato_prod_${Date.now().toString(36)}`
        const trackingNumber = `YMT${Date.now()}`
        return { deliveryId, trackingNumber } as ShipmentResponse
      }
    } catch (error) {
      console.error('Yamato createShipment error:', error)
      throw error
    }
  },
  async verifyWebhook(headers: Record<string,string>, body: Buffer | string) {
    try {
      if (isTestMode()) {
        // テストモード：検証をスキップ
        console.log('Yamato Test Mode - Skipping webhook verification')
        return true
      }

      // 本番モード：HMAC-SHA256検証
      const secret = getEnv('YAMATO_WEBHOOK_SECRET')
      if (!secret) {
        console.error('YAMATO_WEBHOOK_SECRET is not set for production mode')
        return false
      }

      const payload = typeof body === 'string' ? body : body.toString('utf8')
      const sigHeader = (headers['x-yamato-signature'] || headers['X-YAMATO-SIGNATURE'] || '') as string

      if (!sigHeader) {
        console.error('Missing X-Yamato-Signature header')
        return false
      }

      const h = crypto.createHmac('sha256', secret).update(payload).digest('hex')
      const isValid = crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(sigHeader, 'hex'))

      console.log('Yamato webhook verification:', isValid ? 'valid' : 'invalid')
      return isValid
    } catch (error) {
      console.error('Yamato verifyWebhook error:', error)
      return false
    }
  },
  async handleWebhookEvent(body: any) {
    try {
      console.log('Yamato webhook event received:', body)

      if (!body || !body.deliveryId) {
        console.error('Invalid webhook payload: missing deliveryId')
        return
      }

      // TODO: Firestoreやデータベースで配送ステータスを更新
      // ここではログ出力のみ
      console.log('Yamato delivery status update:', {
        deliveryId: body.deliveryId,
        status: body.status || 'updated',
        eventType: body.eventType || null,
        trackingNumber: body.trackingNumber || null
      })

      // Firestore更新（必要に応じて）
      try {
        const { patchDoc } = await import('../../firestoreRest')
        await patchDoc('deliveries', body.deliveryId, {
          status: body.status || 'updated',
          lastEvent: body.eventType || null,
          trackingNumber: body.trackingNumber || null,
          updatedAt: new Date().toISOString()
        })
        console.log('Yamato delivery status updated in database')
      } catch (e) {
        console.warn('Yamato handleWebhookEvent database update failed:', e)
      }
    } catch (error) {
      console.error('Yamato handleWebhookEvent error:', error)
    }
  }
}
