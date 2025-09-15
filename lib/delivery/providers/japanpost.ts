import { DeliveryProvider, RateQuote, ShipmentResponse } from '../provider'

const ID = 'japanpost'

export const japanPostProvider: DeliveryProvider = {
  id: ID,
  async getRates() {
    // Dummy: call eShoin / ゆうパック API in real implementation
    return [ { courierId: ID, serviceCode: 'YU_PACK', amount: 700, currency: 'JPY', eta: '2-3 days' } ] as RateQuote[]
  },
  async createShipment() {
    return { deliveryId: `jp_${Date.now().toString(36)}`, trackingNumber: `JP${Date.now()}` } as ShipmentResponse
  },
  async verifyWebhook() {
    return true
  },
  async handleWebhookEvent() {
    return
  }
}
