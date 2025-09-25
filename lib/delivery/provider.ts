export type Address = {
  name?: string
  postalCode?: string
  prefecture?: string
  city?: string
  line1?: string
  phone?: string
}

export type RateQuote = {
  courierId: string
  serviceCode: string
  amount: number
  currency: string
  eta?: string
  meta?: Record<string, unknown>
}

export type ShipmentRequest = {
  orderId?: string
  packageInfo: { weightGrams?: number; width?: number; height?: number; depth?: number }
  origin: Address
  destination: Address
  serviceCode: string
  pickupWindow?: { start: string; end: string }
}

export type ShipmentResponse = {
  deliveryId: string
  trackingNumber?: string
  labelUrl?: string
  raw?: unknown
}

export interface DeliveryProvider {
  id: string
  getRates(req: { origin: Address; destination: Address; weightGrams?: number }): Promise<RateQuote[]>
  createShipment(req: ShipmentRequest): Promise<ShipmentResponse>
  verifyWebhook(headers: Record<string,string>, body: Buffer | string): Promise<boolean>
  handleWebhookEvent(body: unknown): Promise<void>
}
