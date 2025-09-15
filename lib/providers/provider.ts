export type OrderItem = {
  sku: string
  name?: string
  quantity: number
  unitPrice: number
}

export type CustomerInfo = {
  address?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  name?: string
}

export type OrderInput = {
  id?: string
  items: OrderItem[]
  currency?: string
  total?: number
  shippingFee?: number  // 送料を追加
  customerInfo?: CustomerInfo  // 顧客情報を追加
  metadata?: Record<string, any>
}

export interface Provider {
  createCheckoutSession(order: OrderInput): Promise<{ checkoutUrl?: string; sessionId?: string }>
  verifyWebhook(headers: Record<string, string>, body: string): Promise<{ valid: boolean; payload?: any }>
  handleWebhookEvent(payload: any): Promise<void>
}

// Default export is not provided — concrete providers implement this interface.
