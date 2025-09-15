import { Provider, OrderInput } from './provider'

export const squareProvider: Provider = {
  async createCheckoutSession(order: OrderInput) {
    // Minimal stub: in production use Square SDK to create a Checkout or Payment Link
    // 送料込みの合計金額を考慮した処理
    const totalAmount = order.total || (
      order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) +
      (order.shippingFee || 0)
    )
    
    // Here we return a placeholder URL for testing with shipping included
    return { 
      checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/mock-checkout?orderId=${order.id || 'temp'}&total=${totalAmount}&shipping=${order.shippingFee || 0}` 
    }
  },
  async verifyWebhook(headers: Record<string, string>, body: string) {
    // In production, verify signature with SQUARE_WEBHOOK_SIGNATURE_KEY
    // For now, accept all webhooks when signature key is not set
    const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    if (!sigKey) return { valid: true, payload: JSON.parse(body || '{}') }
    // TODO: implement HMAC verification
    return { valid: false }
  },
  async handleWebhookEvent(payload: any) {
    // Persist event, update orders/payments in DB.
    // This is a stub for integration; actual DB operations go here.
    console.log('square webhook event received:', payload?.type || '(no type)')
  }
}
