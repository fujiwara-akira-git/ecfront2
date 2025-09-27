import Stripe from 'stripe'
import crypto from 'crypto'

// Narrowed type for the parts of Checkout Session we rely on in webhook handling.

type ExpandedLineItemPrice = {
  id?: string
  object?: string
  unit_amount?: number | null
  product?: string | Stripe.Product | null
  metadata?: Record<string, string> | undefined
  // price may contain product metadata and recurring info in other contexts
  recurring?: { interval?: string; interval_count?: number } | null
}

type ExpandedLineItem = {
  id?: string
  object?: string
  quantity?: number
  price?: ExpandedLineItemPrice | null
  description?: string | null
  amount_subtotal?: number | null
  amount_total?: number | null
  price_data?: {
    currency?: string | null
    product_data?: { name?: string | null; metadata?: Record<string, string> | undefined } | null
    unit_amount?: number | null
  } | null
}

type ExpandedLineItems = {
  object?: string
  data: ExpandedLineItem[]
  has_more?: boolean
}

export type ExpandedCheckoutSession = {
  id?: string
  object?: string
  amount_total?: number | null
  amount_subtotal?: number | null
  currency?: string | null
  // payment_intent may be an id string or an expanded object
  payment_intent?: string | (Stripe.PaymentIntent & { charges?: { data?: Array<Stripe.Charge> } }) | null
  customer?: string | Stripe.Customer | null
  customer_details?: {
    email?: string | null
    name?: string | null
    phone?: string | null
    address?: {
      postal_code?: string | null
      state?: string | null
      city?: string | null
      line2?: string | null
      country?: string | null
    } | null
  } | null
  shipping_details?: {
    address?: {
      postal_code?: string | null
      state?: string | null
      city?: string | null
      line1?: string | null
      line2?: string | null
      country?: string | null
    } | null
    name?: string | null
    phone?: string | null
  } | null
  // shipping_cost may be present on some sessions
  shipping_cost?: { amount_total?: number | null } | null
  // charges may be present on expanded PaymentIntent or session
  charges?: { data?: Array<Stripe.Charge> } | null
  metadata?: (Record<string, string> & {
    orderId?: string
    expectedTotal?: string
    userEmail?: string
    shippingAddress?: string
    postalCode?: string
    phoneNumber?: string
    deliveryService?: string
    weightGrams?: string
    userId?: string
  }) | undefined
  line_items?: ExpandedLineItems | null
  amount_details?: Record<string, unknown> | undefined
  // allow passthrough for other fields we don't strictly type here
  [k: string]: unknown
}
import { Provider, OrderInput } from './provider'
import { prisma } from '../prisma'
import { splitJapaneseAddress } from '@/lib/address'
import type { Prisma } from '@prisma/client'
import { runWithRetry } from '@/lib/dbWithRetry'
import config from '../config'
import os from 'os'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
let stripe: Stripe | null = null
try {
  stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
} catch (initErr) {
  console.error('[stripe] initialization error:', initErr)
  // keep stripe as null; functions below will check and throw meaningful errors
}

// Test helper to inject a mock Stripe client in unit tests
export function setStripeClient(client: unknown) {
  stripe = client as unknown as Stripe
}

const STRIPE_DEBUG = (process.env.STRIPE_DEBUG === 'true')
function stripeDebug(...args: unknown[]) {
  if (STRIPE_DEBUG) console.log('[stripe:debug]', ...args)
}

// Delegate retry logic to shared runWithRetry helper. Keep a thin adapter so
// existing call sites using `withRetries(fn)` continue to work.
async function withRetries<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  return runWithRetry(fn, { retries: attempts })
}

// Use exported `ExpandedCheckoutSession` declared above for typed session access.

// Helpers for safe metadata and value parsing
function toStringMetadata(metadata?: Record<string, unknown>): Record<string, string> | undefined {
  if (!metadata) return undefined
  const out: Record<string, string> = {}
  for (const key of Object.keys(metadata)) {
    const v = metadata[key]
    if (v === undefined || v === null) continue
    out[key] = typeof v === 'string' ? v : String(v)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!metadata) return undefined
  const v = metadata[key]
  if (v === undefined || v === null) return undefined
  return typeof v === 'string' ? v : String(v)
}

function parseBooleanish(v?: string | boolean | undefined): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true'
  return false
}

function extractCustomerIdFromSessionCustomer(sessionCustomer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | undefined {
  if (!sessionCustomer) return undefined
  if (typeof sessionCustomer === 'string') return sessionCustomer
  // object case
  if ('id' in sessionCustomer && typeof sessionCustomer.id === 'string') return sessionCustomer.id
  return undefined
}

// Safely extract an `id` string from a value that may be a string or object.
function getIdFromUnknown(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>
    const id = obj.id
    if (typeof id === 'string') return id
  }
  return undefined
}

// Attempt to extract a charge/payment id from a possibly-expanded PaymentIntent-like object.
function getChargeIdFromPaymentIntent(pi: unknown): string | undefined {
  if (!pi) return undefined
  if (typeof pi === 'string') return pi
  if (typeof pi === 'object' && pi !== null) {
    const obj = pi as Record<string, unknown>

    // latest_charge may be string or an object with an `id`
    const latest = obj.latest_charge
    if (latest) {
      if (typeof latest === 'string') return latest
      if (typeof latest === 'object' && latest !== null) {
        const lid = (latest as Record<string, unknown>).id
        if (typeof lid === 'string') return lid
      }
    }

    // charges?.data?.[0]
    const charges = obj.charges
    if (charges && typeof charges === 'object') {
      const c = charges as Record<string, unknown>
      const data = c.data
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0]
        if (typeof first === 'string') return first
        if (typeof first === 'object' && first !== null) {
          const fid = (first as Record<string, unknown>).id
          if (typeof fid === 'string') return fid
        }
      }
    }

    // fallback to top-level id
    if (typeof obj.id === 'string') return obj.id
  }
  return undefined
}

function extractCustomerEmail(sessionCustomer: unknown): string | undefined {
  if (!sessionCustomer) return undefined
  if (typeof sessionCustomer === 'object' && sessionCustomer !== null) {
    const obj = sessionCustomer as Record<string, unknown>
    const email = obj.email
    if (typeof email === 'string') return email
  }
  return undefined
}

function getStringFromRecord(r: Record<string, unknown> | undefined | null, key: string): string | undefined {
  if (!r) return undefined
  const v = r[key]
  return typeof v === 'string' ? v : undefined
}

function getAddressFromUnknown(a: unknown): { line1?: string; line2?: string; postal_code?: string; city?: string; state?: string } | undefined {
  if (!a || typeof a !== 'object' || a === null) return undefined
  const addrRec = a as Record<string, unknown>
  const out: { line1?: string; line2?: string; postal_code?: string; city?: string; state?: string } = {}
  if (typeof addrRec.line1 === 'string') out.line1 = addrRec.line1
  if (typeof addrRec.line2 === 'string') out.line2 = addrRec.line2
  if (typeof addrRec.postal_code === 'string') out.postal_code = addrRec.postal_code
  if (typeof addrRec.city === 'string') out.city = addrRec.city
  if (typeof addrRec.state === 'string') out.state = addrRec.state
  return Object.keys(out).length > 0 ? out : undefined
}

// Helper to get payload.data.object from a parsed webhook payload safely
function getPayloadObject(payloadAny?: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!payloadAny) return undefined
  const data = payloadAny.data
  if (!data || typeof data !== 'object') return undefined
  const maybeObj = (data as Record<string, unknown>)['object']
  if (!maybeObj || typeof maybeObj !== 'object') return undefined
  return maybeObj as Record<string, unknown>
}

function getPayloadMetadata(payloadAny?: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const obj = getPayloadObject(payloadAny)
  if (!obj) return undefined
  const meta = obj.metadata
  if (!meta || typeof meta !== 'object') return undefined
  return meta as Record<string, unknown>
}

// Helper: safely extract message/stack from unknown error-like values for logging
function getErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string') return e.message
    try {
      return String(err)
    } catch (_e) {
      return undefined
    }
  }
  return undefined
}

function getErrorStack(err: unknown): string | null {
  if (!err) return null
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e.stack === 'string') return e.stack
  }
  return null
}

// Narrow a possible expanded session shipping_details into a typed shape
function getSessionShippingDetails(session: ExpandedCheckoutSession | null | undefined): { address?: { postal_code?: string; state?: string; city?: string; line1?: string; line2?: string }; name?: string; phone?: string } | undefined {
  if (!session) return undefined
  const s = session as unknown as Record<string, unknown>
  const sd = s.shipping_details as Record<string, unknown> | undefined
  if (!sd || typeof sd !== 'object') return undefined
  const addrRec = sd.address as Record<string, unknown> | undefined
  const address: { [k: string]: string } = {}
  if (addrRec) {
    if (typeof addrRec.postal_code === 'string') address.postal_code = addrRec.postal_code
    if (typeof addrRec.state === 'string') address.state = addrRec.state
    if (typeof addrRec.city === 'string') address.city = addrRec.city
    if (typeof addrRec.line1 === 'string') address.line1 = addrRec.line1
    if (typeof addrRec.line2 === 'string') address.line2 = addrRec.line2
  }
  const out: { address?: { [k: string]: string }; name?: string; phone?: string } = {}
  if (Object.keys(address).length > 0) out.address = address
  if (sd && typeof sd.name === 'string') out.name = sd.name
  if (sd && typeof sd.phone === 'string') out.phone = sd.phone
  return Object.keys(out).length > 0 ? out : undefined
}

function getSessionLineItems(session: ExpandedCheckoutSession | null | undefined): ExpandedLineItem[] {
  if (!session) return []
  const s = session as unknown as Record<string, unknown>
  const li = s.line_items as Record<string, unknown> | undefined
  if (!li || typeof li !== 'object') return []
  const data = (li as Record<string, unknown>).data
  if (!Array.isArray(data)) return []
  return data as ExpandedLineItem[]
}

// Exported helper for unit tests: resolve total amount using session metadata precedence.
export function resolveTotalFromSession(session: ExpandedCheckoutSession | null | undefined): number {
  if (!session) return 0
  const metaExpectedTotal = session.metadata && session.metadata.expectedTotal ? parseInt(String(session.metadata.expectedTotal)) : undefined
  return metaExpectedTotal || (typeof session.amount_total === 'number' ? session.amount_total : 0)
}

// Helper: fetch expanded session from Stripe; fall back to payload.data.object when appropriate
async function fetchExpandedSession(sessionId: string, payload: Stripe.Event | unknown): Promise<{ session: ExpandedCheckoutSession | null, sessionId: string | undefined, recoveredFromPayload: boolean }> {
  if (!sessionId) return { session: null as ExpandedCheckoutSession | null, sessionId: undefined, recoveredFromPayload: false }

  const disablePayloadFallbackInProd = String(process.env.DISABLE_STRIPE_PAYLOAD_FALLBACK_IN_PRODUCTION || '').toLowerCase() === 'true'
  let session: ExpandedCheckoutSession | null = null
  let recoveredFromPayload = false

  const payloadAny = payload as Record<string, unknown> | undefined
  try {
    if (!stripe) throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
  session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent', 'line_items', 'customer'] }) as unknown as ExpandedCheckoutSession
    try {
      const fs = await import('fs')
      const path = await import('path')
      const dbgDir = os.tmpdir()
      try { fs.mkdirSync(dbgDir, { recursive: true }) } catch (e) { /* ignore */ }
      const dbgPath = path.join(dbgDir, 'stripe-full-debug.log')
      const dump = { ts: new Date().toISOString(), action: 'session_full_dump', eventId: payloadAny?.id, sessionId, sessionMetadata: session.metadata || null, sessionShippingDetails: session.shipping_details || null, sessionCustomerDetails: session.customer_details || null, payment_intent: session.payment_intent || null, session: session || null }
      fs.appendFileSync(dbgPath, JSON.stringify(dump) + '\n')
    } catch (e) { /* ignore logging */ }
    try {
      const fs = await import('fs')
      const path = await import('path')
      const dbgPath = path.join(os.tmpdir(), 'stripe-handler-debug.log')
  const liLen = getSessionLineItems(session).length
      const entry = JSON.stringify({ ts: new Date().toISOString(), action: 'session_retrieved', sessionId, lineItemsLength: liLen, hasMetadata: !!session.metadata }) + '\n'
      fs.appendFileSync(dbgPath, entry)
    } catch (e) { /* ignore logging */ }
  } catch (retrieveErr: any) {
    const isResourceMissing = retrieveErr && (retrieveErr.code === 'resource_missing' || retrieveErr?.raw?.code === 'resource_missing' || retrieveErr?.statusCode === 404)
      if (isResourceMissing) {
      console.warn('[stripe] checkout.session not found on Stripe for id (fixture or deleted):', sessionId)
      console.warn('[stripe] retrieve error details:', { code: retrieveErr?.code, message: retrieveErr?.message, statusCode: retrieveErr?.statusCode, type: retrieveErr?.type })
      try {
        const fs = await import('fs')
        const path = await import('path')
        const dbgDir = os.tmpdir()
        try { fs.mkdirSync(dbgDir, { recursive: true }) } catch (e) { /* ignore */ }
        const dbgPath = path.join(dbgDir, 'stripe-full-debug.log')
        const requestLogUrl = retrieveErr?.request_log_url || retrieveErr?.requestLogUrl || retrieveErr?.raw?.request_log_url || retrieveErr?.raw?.request_log || undefined
        const dump = { ts: new Date().toISOString(), action: 'session_retrieve_resource_missing', eventId: payloadAny?.id, sessionId, retrieveErr: { code: retrieveErr?.code, message: retrieveErr?.message, statusCode: retrieveErr?.statusCode, requestLogUrl } }
        try { fs.appendFileSync(dbgPath, JSON.stringify(dump) + '\n') } catch (e) { /* best-effort */ }
      } catch (e) { /* ignore logging failures */ }
      // If payload fallback is disabled in production, we still want to allow a
      // fallback for checkout.session.completed events because Stripe sometimes
      // returns resource_missing for sessions (fixture / deleted) while the
      // webhook payload still contains the full session object needed to
      // finalize orders. Keep the restrictive behavior for other event types.
      if (disablePayloadFallbackInProd && process.env.NODE_ENV === 'production') {
        const evType = payloadAny && typeof (payloadAny as any).type === 'string' ? (payloadAny as any).type : undefined
        if (evType !== 'checkout.session.completed') {
          console.warn('[stripe] payload fallback disabled in production by DISABLE_STRIPE_PAYLOAD_FALLBACK_IN_PRODUCTION; marking event processed and skipping (non-checkout.session.completed)')
          try {
            const eid = payloadAny && typeof (payloadAny as any).id === 'string' ? (payloadAny as any).id : undefined
            const etype = payloadAny && typeof (payloadAny as any).type === 'string' ? (payloadAny as any).type : undefined
            if (eid && etype) {
              await prisma.stripeEvent.upsert({ where: { id: eid }, create: { id: eid, type: etype, payload: payloadAny as Prisma.InputJsonValue, processed: true, processedAt: new Date() }, update: { processed: true, processedAt: new Date() } })
            } else {
              console.warn('[stripe] cannot mark event processed: missing id/type on payloadAny')
            }
          } catch (e) {
            console.warn('[stripe] marking event processed failed (prod fallback disabled):', e)
          }
          return { session: null as ExpandedCheckoutSession | null, sessionId, recoveredFromPayload: false }
        }
        console.warn('[stripe] payload fallback disabled in production but allowing checkout.session.completed fallback for resilience')
      }
          try {
            const rawSession = getPayloadObject(payloadAny)
            if (rawSession) {
              session = rawSession as ExpandedCheckoutSession
              recoveredFromPayload = true
              try {
                const fs = await import('fs')
                const path = await import('path')
                const dbgDir = os.tmpdir()
                try { fs.mkdirSync(dbgDir, { recursive: true }) } catch (e) { /* ignore */ }
                const dbgPath = path.join(dbgDir, 'stripe-full-debug.log')
                const dump = { ts: new Date().toISOString(), action: 'session_full_dump_fallback_payload', eventId: payloadAny?.id, sessionId, sessionMetadata: session.metadata || null, sessionShippingDetails: session.shipping_details || null, sessionCustomerDetails: session.customer_details || null, payment_intent: session.payment_intent || null, session: session || null }
                fs.appendFileSync(dbgPath, JSON.stringify(dump) + '\n')
              } catch (e) { /* ignore logging errors */ }
              try {
                const fs = await import('fs')
                const path = await import('path')
                const dbgPath = path.join(os.tmpdir(), 'stripe-handler-debug.log')
                const liLen = getSessionLineItems(session).length
                const entry = JSON.stringify({ ts: new Date().toISOString(), action: 'session_retrieved_via_payload_fallback', sessionId, lineItemsLength: liLen, hasMetadata: !!session.metadata }) + '\n'
                fs.appendFileSync(dbgPath, entry)
              } catch (e) { /* ignore logging */ }
            } else {
          try {
            const eid = payloadAny && typeof (payloadAny as any).id === 'string' ? (payloadAny as any).id : undefined
            const etype = payloadAny && typeof (payloadAny as any).type === 'string' ? (payloadAny as any).type : undefined
            if (eid && etype) {
              await prisma.stripeEvent.upsert({ where: { id: eid }, create: { id: eid, type: etype, payload: payloadAny as Prisma.InputJsonValue, processed: true, processedAt: new Date() }, update: { processed: true, processedAt: new Date() } })
            } else {
              console.warn('[stripe] cannot mark event processed: missing id/type on payloadAny')
            }
          } catch (e) { console.warn('[stripe] marking event processed failed:', e) }
          return { session: null as ExpandedCheckoutSession | null, sessionId, recoveredFromPayload: false }
        }
      } catch (e) {
        console.error('[stripe] fallback payload processing failed for session:', sessionId, e)
        throw retrieveErr
      }
    }
    try {
      // If not a resource_missing case, still write a compact debug entry so
      // we can correlate the Stripe request in the dashboard when troubleshooting.
      const fs = await import('fs')
      const path = await import('path')
      const dbgPath = path.join(os.tmpdir(), 'stripe-full-debug.log')
      const requestLogUrl = retrieveErr?.request_log_url || retrieveErr?.requestLogUrl || retrieveErr?.raw?.request_log_url || undefined
      const dump = { ts: new Date().toISOString(), action: 'session_retrieve_failed', eventId: payloadAny?.id, sessionId, retrieveErr: { code: retrieveErr?.code, message: retrieveErr?.message, statusCode: retrieveErr?.statusCode, requestLogUrl } }
      try { fs.appendFileSync(dbgPath, JSON.stringify(dump) + '\n') } catch (e) { /* best-effort */ }
    } catch (e) { /* ignore logging failures */ }
    if (!recoveredFromPayload) {
      console.error('[stripe] failed to retrieve checkout session:', sessionId, { error: retrieveErr?.message, code: retrieveErr?.code, statusCode: retrieveErr?.statusCode })
      throw retrieveErr
    }
  }

  if (!session) {
    console.error('[stripe] session is null after retrieval/fallback for id:', sessionId)
    throw new Error('session missing after retrieval and fallback')
  }
  return { session: session as ExpandedCheckoutSession, sessionId, recoveredFromPayload }
}

// Export helper for unit testing
export { fetchExpandedSession }

// Helper: resolve order via paymentIntent -> payment -> order update (idempotency)
async function resolveOrCreateOrder(session: ExpandedCheckoutSession | null, payload: Stripe.Event | unknown, matchedUserId: string | undefined, shippingAddress: string, paymentIntentId: string | undefined, sessionId?: string): Promise<{ order: { id: string } | null }> {
  let order: { id: string } | null = null
  const payloadAny = payload as Record<string, unknown> | undefined
  // Ensure we have a working session object for typed access within this helper.
  // If null, use an empty cast object to avoid many null checks; callers should pass session when available.
  const s: ExpandedCheckoutSession = (session || ({} as ExpandedCheckoutSession)) as ExpandedCheckoutSession
  if (paymentIntentId) {
    try {
      const existingPayment = await prisma.payment.findFirst({ where: { stripeId: paymentIntentId } })
      if (existingPayment && existingPayment.orderId) {
        try {
          const found = await prisma.order.findUnique({ where: { id: existingPayment.orderId } })
          if (found) {
            const finalCustomerEmail = getStringFromRecord((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>) : undefined, 'email') || extractCustomerEmail(s.customer) || found.customerEmail
            const cdName = getStringFromRecord((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>) : undefined, 'name')
            const sessionName = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).name === 'string') ? (s.customer as Stripe.Customer).name : undefined
            const dbName = found.customerName ?? ''
            const finalCustomerName: string = cdName ?? sessionName ?? dbName
            const cdPhone = getStringFromRecord((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>) : undefined, 'phone')
            const sessionPhone = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).phone === 'string') ? (s.customer as Stripe.Customer).phone : undefined
            const dbPhone = found.customerPhone ?? ''
            const finalCustomerPhone: string = cdPhone ?? sessionPhone ?? dbPhone
            // Try to resolve postal code from multiple sources: customer_details.address, session metadata, or payload
            const addrSrcForUpdate = getAddressFromUnknown((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>)['address'] : undefined)
            const payloadMetadataForUpdate = getPayloadMetadata(payloadAny)
            const metaPostalForUpdate = s && s.metadata && (s.metadata.postalCode || s.metadata.postal_code) ? String(s.metadata.postalCode || s.metadata.postal_code) : (payloadMetadataForUpdate && (payloadMetadataForUpdate.postalCode || payloadMetadataForUpdate.postal_code) ? String(payloadMetadataForUpdate.postalCode || payloadMetadataForUpdate.postal_code) : undefined)
            const sessionShippingAddrForUpdate = (s && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address) ? (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address : undefined
            const resolvedPostalForUpdate = (addrSrcForUpdate && addrSrcForUpdate.postal_code) ? addrSrcForUpdate.postal_code : (metaPostalForUpdate ? metaPostalForUpdate : (sessionShippingAddrForUpdate && sessionShippingAddrForUpdate.postal_code ? sessionShippingAddrForUpdate.postal_code : undefined))
            const metaExpectedTotal = s.metadata && s.metadata.expectedTotal ? parseInt(String(s.metadata.expectedTotal)) : undefined
            const resolvedTotalForUpdate = metaExpectedTotal || s.amount_total || found.totalAmount
            if (metaExpectedTotal && metaExpectedTotal !== (s.amount_total || 0)) {
              console.warn('[stripe] metadata.expectedTotal differs from session.amount_total; using metadata as source-of-truth for order total', { sessionId, metaExpectedTotal, sessionAmount: s.amount_total })
            }
            // derive prefecture/city/rest from shippingAddress/user fallback
            const addrPartsUpdate = splitJapaneseAddress(shippingAddress || found.shippingAddress || (found.userId ? ((found as unknown) as { user?: { address?: string } }).user?.address : undefined))
                                const updateDataTyped: any = {}
                                updateDataTyped.status = { set: 'paid' }
                                updateDataTyped.totalAmount = { set: resolvedTotalForUpdate }
                                updateDataTyped.subtotal = { set: resolvedTotalForUpdate - (s.shipping_cost?.amount_total || 0) }
                                updateDataTyped.shippingFee = { set: s.shipping_cost?.amount_total || 0 }
                                updateDataTyped.customerEmail = { set: finalCustomerEmail }
                                updateDataTyped.customerName = { set: finalCustomerName }
                                updateDataTyped.customerPhone = { set: finalCustomerPhone }
                                updateDataTyped.shippingAddress = { set: shippingAddress || ((found as unknown as { shippingAddress?: string }).shippingAddress) }
                                updateDataTyped.postalCode = { set: resolvedPostalForUpdate || ((found as unknown as { postalCode?: string }).postalCode) }
                                updateDataTyped.notes = { set: `Stripe Session ID: ${sessionId}` }
                                updateDataTyped.preCreated = { set: false }
                                if (matchedUserId) updateDataTyped.user = { connect: { id: matchedUserId } }
                                if (addrPartsUpdate?.prefecture && !found.shippingPrefecture) updateDataTyped.shippingPrefecture = { set: addrPartsUpdate.prefecture }
                                if (addrPartsUpdate?.city && !found.shippingCity) updateDataTyped.shippingCity = { set: addrPartsUpdate.city }
                                if (addrPartsUpdate?.rest && !found.shippingRest) updateDataTyped.shippingRest = { set: addrPartsUpdate.rest }
                                // Log which source provided each address piece for diagnostics
                                const addressSourcesUpdate: Record<string, string | undefined> = {
                                  shippingAddress: sessionShippingAddrForUpdate ? 'session.shipping_details' : (addrSrcForUpdate ? 'customer_details' : (s && s.metadata ? 'metadata' : found ? 'existing_order' : undefined)),
                                  postalCode: addrSrcForUpdate && addrSrcForUpdate.postal_code ? 'customer_details' : (metaPostalForUpdate ? 'metadata' : (sessionShippingAddrForUpdate && sessionShippingAddrForUpdate.postal_code ? 'session.shipping_details' : (found && found.postalCode ? 'existing_order' : undefined))),
                                  prefecture: sessionShippingAddrForUpdate && (sessionShippingAddrForUpdate.state) ? 'session.shipping_details' : (addrPartsUpdate && addrPartsUpdate.prefecture ? 'parsed_shippingAddress' : undefined),
                                  city: sessionShippingAddrForUpdate && (sessionShippingAddrForUpdate.city) ? 'session.shipping_details' : (addrPartsUpdate && addrPartsUpdate.city ? 'parsed_shippingAddress' : undefined),
                                  rest: sessionShippingAddrForUpdate && (sessionShippingAddrForUpdate.line1 || sessionShippingAddrForUpdate.line2) ? 'session.shipping_details' : (addrPartsUpdate && addrPartsUpdate.rest ? 'parsed_shippingAddress' : undefined)
                                }
                                console.log('[stripe][address-sources][paymentIntentMatch]', { sessionId, orderId: found.id, addressSources: addressSourcesUpdate })
                                order = await withRetries(() => prisma.order.update({ where: { id: found.id }, data: updateDataTyped }))
            console.log('[stripe] reused existing order found via payment.stripeId:', found.id)
          }
        } catch (e) {
          console.warn('[stripe] error reusing order via existing payment:', e)
        }
      }
    } catch (e) {
      console.warn('[stripe] could not query existing payment for idempotency:', e)
    }
  }
  // If we didn't resolve an order via paymentIntent, attempt to resolve via metadata.orderId
  try {
  const payloadMetadataForExisting = getPayloadMetadata(payloadAny)
  const existingOrderId = (s && s.metadata && s.metadata.orderId) ? String(s.metadata.orderId) : (payloadMetadataForExisting && payloadMetadataForExisting.orderId ? String(payloadMetadataForExisting.orderId) : undefined)
    if (!order && existingOrderId) {
      try {
        const found = await prisma.order.findUnique({ where: { id: existingOrderId } })
        if (found) {
          // resolve possible postal code similarly when updating via metadata.orderId
          const addrSrcForMeta = getAddressFromUnknown((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>)['address'] : undefined)
          const payloadMetadataForMeta = getPayloadMetadata(payloadAny)
          const metaPostalForMeta = s && s.metadata && (s.metadata.postalCode || s.metadata.postal_code) ? String(s.metadata.postalCode || s.metadata.postal_code) : (payloadMetadataForMeta && (payloadMetadataForMeta.postalCode || payloadMetadataForMeta.postal_code) ? String(payloadMetadataForMeta.postalCode || payloadMetadataForMeta.postal_code) : undefined)
          const sessionShippingAddrForMeta = (s && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address) ? (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address : undefined
          const resolvedPostalForMeta = (addrSrcForMeta && addrSrcForMeta.postal_code) ? addrSrcForMeta.postal_code : (metaPostalForMeta ? metaPostalForMeta : (sessionShippingAddrForMeta && sessionShippingAddrForMeta.postal_code ? sessionShippingAddrForMeta.postal_code : undefined))
                  // Prefer structured shipping details from session when available
                  const sessionAddrObjMeta = sessionShippingAddrForMeta ? sessionShippingAddrForMeta as Record<string, string> : undefined
                  const sessionAddrCandidateMeta = sessionAddrObjMeta ? [sessionAddrObjMeta.postal_code, sessionAddrObjMeta.state, sessionAddrObjMeta.city, sessionAddrObjMeta.line1, sessionAddrObjMeta.line2].filter(Boolean).join(' ') : undefined
                  const addrPartsMeta = splitJapaneseAddress(sessionAddrCandidateMeta || shippingAddress || found.shippingAddress || (found.userId ? ((found as unknown) as { user?: { address?: string } }).user?.address : undefined))
                            const updateDataMetaTyped: Prisma.OrderUpdateInput = {}
                            updateDataMetaTyped.status = { set: 'paid' }
                            updateDataMetaTyped.shippingAddress = { set: shippingAddress || ((found as unknown as { shippingAddress?: string }).shippingAddress) }
                            updateDataMetaTyped.postalCode = { set: resolvedPostalForMeta || ((found as unknown as { postalCode?: string }).postalCode) }
                            if (matchedUserId) updateDataMetaTyped.user = { connect: { id: matchedUserId } }
                            updateDataMetaTyped.notes = { set: sessionId ? `Stripe Session ID: ${sessionId}` : ((found as unknown as { notes?: string }).notes) }
                            if (sessionAddrObjMeta) {
                              if (sessionAddrObjMeta.state && !found.shippingPrefecture) updateDataMetaTyped.shippingPrefecture = { set: sessionAddrObjMeta.state }
                              if (sessionAddrObjMeta.city && !found.shippingCity) updateDataMetaTyped.shippingCity = { set: sessionAddrObjMeta.city }
                              const restMeta = [sessionAddrObjMeta.line1, sessionAddrObjMeta.line2].filter(Boolean).join(' ')
                              if (restMeta && !found.shippingRest) updateDataMetaTyped.shippingRest = { set: restMeta }
                            } else {
                              if (addrPartsMeta?.prefecture && !found.shippingPrefecture) updateDataMetaTyped.shippingPrefecture = { set: addrPartsMeta.prefecture }
                              if (addrPartsMeta?.city && !found.shippingCity) updateDataMetaTyped.shippingCity = { set: addrPartsMeta.city }
                              if (addrPartsMeta?.rest && !found.shippingRest) updateDataMetaTyped.shippingRest = { set: addrPartsMeta.rest }
                            }
                            // Log address sources for metadata.orderId update
                            const addressSourcesMeta: Record<string, string | undefined> = {
                              shippingAddress: sessionAddrObjMeta ? 'session.shipping_details' : (shippingAddress ? 'shippingAddress_candidate' : (found && found.shippingAddress ? 'existing_order' : undefined)),
                              postalCode: (sessionAddrObjMeta && sessionAddrObjMeta.postal_code) ? 'session.shipping_details' : (metaPostalForMeta ? 'metadata' : (found && found.postalCode ? 'existing_order' : undefined)),
                              prefecture: sessionAddrObjMeta && sessionAddrObjMeta.state ? 'session.shipping_details' : (addrPartsMeta && addrPartsMeta.prefecture ? 'parsed_session_or_candidate' : undefined),
                              city: sessionAddrObjMeta && sessionAddrObjMeta.city ? 'session.shipping_details' : (addrPartsMeta && addrPartsMeta.city ? 'parsed_session_or_candidate' : undefined),
                              rest: sessionAddrObjMeta && (sessionAddrObjMeta.line1 || sessionAddrObjMeta.line2) ? 'session.shipping_details' : (addrPartsMeta && addrPartsMeta.rest ? 'parsed_session_or_candidate' : undefined)
                            }
                            console.log('[stripe][address-sources][metadata.orderId]', { sessionId, orderId: found.id, addressSources: addressSourcesMeta })
                            order = await withRetries(() => prisma.order.update({ where: { id: found.id }, data: updateDataMetaTyped }))
          console.log('[stripe] reused existing order via metadata.orderId:', found.id)
        }
      } catch (e) {
        console.warn('[stripe] error reusing order via metadata.orderId:', e)
      }
    }
      } catch (e) {
        // ignore
      }

  // Final fallback: if still no order and session contains amount_total, create a new order
  if (!order) {
  try {
  const finalCustomerEmail = getStringFromRecord((s && s.customer_details) ? s.customer_details : undefined, 'email') || (s && s.customer && typeof s.customer === 'string' ? undefined : extractCustomerEmail(s.customer)) || ''
  const cdName = getStringFromRecord((s && s.customer_details) ? s.customer_details : undefined, 'name')
  const sessionName = (s && s.customer && typeof s.customer === 'object' && typeof ((s.customer as unknown) as { name?: string }).name === 'string') ? ((s.customer as unknown) as { name?: string }).name : undefined
  const finalCustomerName: string = cdName ?? sessionName ?? ''
  const cdPhone = getStringFromRecord((s && s.customer_details) ? s.customer_details : undefined, 'phone')
  const sessionPhone = (s && s.customer && typeof s.customer === 'object' && typeof ((s.customer as unknown) as { phone?: string }).phone === 'string') ? ((s.customer as unknown) as { phone?: string }).phone : undefined
  const finalCustomerPhone: string = cdPhone ?? sessionPhone ?? ''

  const metaExpectedTotalNew = s && s.metadata && s.metadata.expectedTotal ? parseInt(String(s.metadata.expectedTotal)) : undefined
  const resolvedTotalForCreate = metaExpectedTotalNew || s.amount_total || 0
      // try to resolve postal code and structured address for creation
  const addrSrcForCreate = getAddressFromUnknown((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>)['address'] : undefined)
  const payloadMetadataForCreate = getPayloadMetadata(payloadAny)
  const metaPostalForCreate = s && s.metadata && (s.metadata.postalCode || s.metadata.postal_code) ? String(s.metadata.postalCode || s.metadata.postal_code) : (payloadMetadataForCreate && (payloadMetadataForCreate.postalCode || payloadMetadataForCreate.postal_code) ? String(payloadMetadataForCreate.postalCode || payloadMetadataForCreate.postal_code) : undefined)
  const sessionShippingAddrForCreate = (s && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address) ? (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address : undefined
      const resolvedPostalForCreate = (addrSrcForCreate && addrSrcForCreate.postal_code) ? addrSrcForCreate.postal_code : (metaPostalForCreate ? metaPostalForCreate : (sessionShippingAddrForCreate && sessionShippingAddrForCreate.postal_code ? sessionShippingAddrForCreate.postal_code : undefined))
      // determine structured pieces from session.shipping_details when present
      const sessionAddrObjCreate = sessionShippingAddrForCreate ? sessionShippingAddrForCreate as Record<string, string> : undefined
      const sessionAddrCandidateCreate = sessionAddrObjCreate ? [sessionAddrObjCreate.postal_code, sessionAddrObjCreate.state, sessionAddrObjCreate.city, sessionAddrObjCreate.line1, sessionAddrObjCreate.line2].filter(Boolean).join(' ') : undefined
      const addrPartsCreate = splitJapaneseAddress(sessionAddrCandidateCreate || shippingAddress || (s && s.metadata && s.metadata.shippingAddress) || undefined)
      order = await withRetries(() => prisma.order.create({
        data: ({
          totalAmount: resolvedTotalForCreate,
          currency: s.currency || 'jpy',
          status: 'paid',
          customerEmail: finalCustomerEmail,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          shippingAddress: shippingAddress || (s && s.metadata && s.metadata.shippingAddress) || '',
          postalCode: resolvedPostalForCreate || (s && s.metadata && (s.metadata.postalCode || s.metadata.postal_code)) || undefined,
          shippingPrefecture: sessionAddrObjCreate?.state || addrPartsCreate?.prefecture || undefined,
          shippingCity: sessionAddrObjCreate?.city || addrPartsCreate?.city || undefined,
          shippingRest: sessionAddrObjCreate ? [sessionAddrObjCreate.line1, sessionAddrObjCreate.line2].filter(Boolean).join(' ') : addrPartsCreate?.rest || undefined,
          subtotal: (s && s.amount_total || 0) - (s && s.shipping_cost ? s.shipping_cost.amount_total || 0 : 0),
          shippingFee: s && s.shipping_cost ? s.shipping_cost.amount_total || 0 : 0,
          notes: sessionId ? `Stripe Session ID: ${sessionId}` : 'created_by_resolveOrCreateOrder',
          userId: matchedUserId ? matchedUserId : undefined
  } as Prisma.OrderUncheckedCreateInput)
      }))
      console.log('[stripe] created fallback order in resolveOrCreateOrder:', order.id)
    } catch (e) {
      console.warn('[stripe] fallback order creation failed in resolveOrCreateOrder:', e)
    }
  }

  return { order }
}

// Export helper for unit testing
export { resolveOrCreateOrder }

export const stripeProvider: Provider = {
  async createCheckoutSession(order: OrderInput) {
    const line_items = (order.items || []).map((rawIt) => {
  const it: Record<string, unknown> = rawIt as Record<string, unknown>
      // Ensure we attach internal productId to price_data.product_data.metadata when available
      const productMetadata: Record<string,string> = {}
      if (it.internalProductId) {
        productMetadata.productId = String(it.internalProductId)
      } else if (it.sku) {
        productMetadata.productId = String(it.sku)
      }
      return {
        price_data: {
          currency: order.currency || 'jpy',
          product_data: { name: typeof it.name === 'string' ? it.name : (typeof it.sku === 'string' ? it.sku : String(it.name || '')), metadata: Object.keys(productMetadata).length>0 ? productMetadata : undefined },
          // JPYの場合、最小単位は1円（他の通貨と異なり100で割らない）
          unit_amount: Math.round(Number(it.unitPrice || 0)),
        },
        quantity: Number(it.quantity || 1),
      }
    })

    // 送料がある場合、line_itemsに追加
    if (order.shippingFee && order.shippingFee > 0) {
      line_items.push({
        price_data: {
          currency: order.currency || 'jpy',
          product_data: { name: '送料', metadata: undefined },
          unit_amount: Math.round(Number(order.shippingFee || 0)),
        },
        quantity: 1,
      })
    }

    // セッション作成のオプションを準備
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || config.NEXTAUTH_URL || config.getBaseUrl()).replace(/\/$/, '')
    console.log('[stripe] using appUrl for success/cancel urls:', appUrl)

    // Ensure userEmail is included in metadata for webhook processing
    const baseMetadata = toStringMetadata(order.metadata) || {}
    const metadata: Record<string,string> = { ...baseMetadata }
    if (order.metadata?.userEmail) {
      metadata.userEmail = order.metadata.userEmail
    }
    if (order.metadata?.userId) {
      metadata.userId = order.metadata.userId
    }
    // Include shipping info from pre-checkout form into metadata as a fallback
    if (order.customerInfo?.address) metadata.shippingAddress = String(order.customerInfo.address)
    if (order.customerInfo?.postalCode) metadata.postalCode = String(order.customerInfo.postalCode)
    if (order.customerInfo?.phone) metadata.phoneNumber = String(order.customerInfo.phone)

  // customer/customer_emailは初期化時に含めない
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      metadata,
      success_url: `${appUrl}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/shop/checkout/cancel`,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['JP'],
      },
      phone_number_collection: {
        enabled: true,
      },
    }

    // Diagnostic logging: what the front-end provided (order.customerInfo) vs
    // what we will send to Stripe in the sessionOptions (address/name/phone fields).
    try {
      const frontShown = order.customerInfo || {}
      const stripeAddressPayload = {
        line1: order.customerInfo?.address || undefined,
        line2: order.customerInfo?.addressLine2 !== undefined ? order.customerInfo?.addressLine2 : '',
        postal_code: order.customerInfo?.postalCode || undefined,
        city: order.customerInfo?.city || '',
        state: order.customerInfo?.state || '',
        country: 'JP'
      }
      console.log('[stripe][checkout][diagnostic] frontShownCustomerInfo:', frontShown)
      console.log('[stripe][checkout][diagnostic] stripeAddressPayload:', stripeAddressPayload)
    } catch (e) {
      console.warn('[stripe][checkout][diagnostic] failed to log checkout address payload:', e)
    }

    // --- 新規改善: Stripe セッション作成前に DB 上で Order + OrderItems を先に作成し、
    // セッションの metadata.orderId にセットすることで、Webhook 側で items が抜ける問題を防ぐ。
    // 既存フローでは webhook が注文を新規作成するが、その際 line_items から商品IDを信頼できないため
    // 事前に orderId を作成して渡す方式に変更する。
  let dbOrder: { id: string } | null = null
    try {
      const subtotalCalc = (order.items || []).reduce((s, it) => s + Math.round((it.unitPrice || 0) * (it.quantity || 0)), 0)
      const shippingFeeCalc = order.shippingFee ? Math.round(order.shippingFee) : 0
      const totalCalc = subtotalCalc + shippingFeeCalc

  const createData: any = {
        totalAmount: totalCalc,
        currency: order.currency || 'jpy',
        status: 'pending',
        customerEmail: order.customerInfo?.email || (order.metadata && order.metadata.userEmail) || '',
        customerName: order.customerInfo?.name || (order.metadata && order.metadata.userName) || '',
        customerPhone: order.customerInfo?.phone || '',
        shippingAddress: order.customerInfo?.address || (order.metadata && order.metadata.shippingAddress) || '',
        postalCode: order.customerInfo?.postalCode || (order.metadata && (order.metadata.postalCode || order.metadata.postal_code)) || undefined,
        // Use structured customerInfo fields directly - the checkout screen provides
        // prefecture/state, city, and address lines, so store those as-is.
        shippingPrefecture: order.customerInfo?.state || undefined,
        shippingCity: order.customerInfo?.city || undefined,
        shippingRest: (() => {
          try {
            const line1 = order.customerInfo?.address || ''
            const line2 = order.customerInfo?.addressLine2 !== undefined && order.customerInfo?.addressLine2 !== null ? String(order.customerInfo.addressLine2) : ''
            const combined = [line1, line2].filter(Boolean).join(' ')
            return combined || undefined
          } catch (e) {
            return undefined
          }
        })(),
        subtotal: subtotalCalc,
        shippingFee: shippingFeeCalc,
  notes: 'Created before checkout session',
  preCreated: true,
        userId: order.metadata?.userId || undefined,
        orderItems: {
          create: (order.items || []).map((it) => ({
            productId: String(it.sku || ''),
            quantity: Number(it.quantity || 1),
            unitPrice: Math.round(Number(it.unitPrice || 0)),
            totalPrice: Math.round(Number(it.unitPrice || 0) * Number(it.quantity || 1))
          }))
        }
      }

    dbOrder = await withRetries(() => prisma.order.create({ data: createData }))
      // ensure metadata object exists and include orderId for webhook linkage
      metadata.orderId = dbOrder.id
      console.log('[stripe] pre-created DB order before checkout session:', dbOrder.id)
      // debug: show shippingAddress and metadata keys passed into session
      try {
        console.log('[stripe][createCheckoutSession] pre-order shippingAddress:', createData.shippingAddress, 'metadataKeys:', Object.keys(metadata))
      } catch (e) { /* ignore logging errors */ }
    } catch (orderCreateErr) {
      console.warn('[stripe] could not pre-create DB order for checkout session, continuing without pre-order:', orderCreateErr)
    }

    // 既存顧客の検索または新規作成
    let customerId: string | undefined

    // Respect forceNewCard metadata: when true, skip matching existing customers and force new customer creation
    const forceNewCard = parseBooleanish(getMetadataValue(order.metadata, 'forceNewCard'))

    // Decide flow based on flags and presence of userEmail
    if (forceNewCard) {
      console.log('[stripe] metadata.forceNewCard=true — skipping existing customer lookup and forcing new customer creation')
      sessionOptions.customer_creation = 'always'
      // Do not set customer_email to avoid linking to existing Stripe customers or saved cards
      // sessionOptions.customer_email intentionally omitted when forcing new card
    } else if (order.metadata && order.metadata.userEmail) {
      if (!stripe) {
        throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
      }

      // メールアドレスで既存顧客を検索
      const existingCustomers = await stripe.customers.list({
        email: order.metadata.userEmail,
        limit: 1
      })

      // 入力値を優先してaddress/name/phoneを構築
      const addressPayload = {
        line1: order.customerInfo?.address || undefined,
        line2: order.customerInfo?.addressLine2 !== undefined ? order.customerInfo?.addressLine2 : '',
        postal_code: order.customerInfo?.postalCode || undefined,
        city: order.customerInfo?.city || '',
        state: order.customerInfo?.state || '',
        country: 'JP'
      }
      const namePayload = order.customerInfo?.name || order.metadata?.userName || undefined
      const phonePayload = order.customerInfo?.phone || undefined

      if (existingCustomers.data.length > 0) {
        // 既存顧客が見つかった場合
        customerId = existingCustomers.data[0].id
        console.log('Stripe: 既存顧客を使用:', customerId)
        // 既存顧客の情報を最新化（住所・電話・氏名があれば更新）
        try {
          const updatePayload: Stripe.CustomerUpdateParams = {}
          if (namePayload) updatePayload.name = namePayload
          if (phonePayload) updatePayload.phone = phonePayload
          if (addressPayload.line1 || addressPayload.line2 || addressPayload.postal_code || addressPayload.city || addressPayload.state) {
            updatePayload.address = {
              line1: addressPayload.line1 || undefined,
              line2: addressPayload.line2 || undefined,
              postal_code: addressPayload.postal_code || undefined,
              city: addressPayload.city || undefined,
              state: addressPayload.state || undefined,
              country: addressPayload.country || undefined,
            }
          }
          if (Object.keys(updatePayload).length > 0) {
            await stripe.customers.update(customerId, updatePayload)
            console.log('Stripe: updated existing customer with new info', customerId)
          }
        } catch (updateErr) {
          console.warn('[stripe] could not update existing customer info:', updateErr)
        }
        // 既存顧客IDをセット（customer_emailはセットしない）
        sessionOptions.customer = customerId
      } else {
        // 新規顧客を作成
        const customer = await stripe.customers.create({
          email: order.metadata.userEmail,
          name: namePayload,
          phone: phonePayload,
          address: (addressPayload.line1 || addressPayload.line2 || addressPayload.postal_code || addressPayload.city || addressPayload.state) ? addressPayload : undefined,
          metadata: {
            userId: order.metadata.userId || '',
            source: 'eagle-palace-ec'
          }
        })
        customerId = customer.id
        console.log('Stripe: 新規顧客を作成:', customerId)
        // 新規顧客の場合はcustomer_emailのみセット
        sessionOptions.customer_email = order.customerInfo?.email || order.metadata?.userEmail || ''
      }

      // カード情報の保存を有効化するかはフロントの saveCard フラグに従う
      const saveCardFlag = parseBooleanish(getMetadataValue(order.metadata, 'saveCard'))
      if (saveCardFlag) {
        sessionOptions.payment_intent_data = {
          setup_future_usage: 'off_session'
        }
      }
    } else {
      // No userEmail: treat as guest and always create a new customer at checkout
      sessionOptions.customer_creation = 'always'
      sessionOptions.customer_email = order.customerInfo?.email || undefined
    }

    if (!stripe) {
      throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
    }
    console.log('[stripe] sessionOptions preview:', {
      success_url: sessionOptions.success_url,
      cancel_url: sessionOptions.cancel_url,
  customer: (sessionOptions as unknown as Record<string, unknown>).customer,
  customer_creation: (sessionOptions as unknown as Record<string, unknown>).customer_creation,
  customer_email: (sessionOptions as unknown as Record<string, unknown>).customer_email,
      metadata: sessionOptions.metadata
    })
    try {
      // Log line_items detail to help diagnose price/product creation errors
      console.log('[stripe] creating checkout session - line_items sample:', Array.isArray(line_items) ? line_items.slice(0, 50) : line_items)
      // Also include a compact JSON dump of sessionOptions (avoid sensitive full dump)
      try {
        const safeDump = {
          ...sessionOptions,
          line_items: Array.isArray(line_items) ? line_items.map(li => ({ quantity: li.quantity, price_data: li.price_data ? { currency: li.price_data.currency, unit_amount: (li.price_data as unknown as { unit_amount?: number }).unit_amount, product_data: li.price_data.product_data ? { name: (li.price_data.product_data as unknown as { name?: string }).name, metadata: (li.price_data.product_data as unknown as { metadata?: Record<string,string> }).metadata } : undefined } : undefined })) : sessionOptions.line_items
        }
        console.log('[stripe] sessionOptions compact dump:', JSON.stringify(safeDump))
      } catch (e) {
        console.warn('[stripe] failed to stringify sessionOptions for debug:', e)
      }
    } catch (e) {
      /* ignore logging errors */
    }
    const session = await stripe.checkout.sessions.create(sessionOptions)

    try {
      console.log('[stripe] created checkout session:', { sessionId: session.id, orderId: metadata.orderId })
      // If we pre-created a DB order, persist the sessionId into its notes for easier lookup
      if (dbOrder && dbOrder.id) {
        try {
          await prisma.order.update({ where: { id: dbOrder.id }, data: { notes: `Created before checkout session; Stripe Session ID: ${session.id}` } })
        } catch (e) {
          console.warn('[stripe] could not persist sessionId to order notes:', e)
        }
      }
    } catch (e) {
      /* ignore logging persistence errors */
    }

    return { checkoutUrl: session.url || undefined, sessionId: session.id }
  },

  async verifyWebhook(headers: Record<string, string>, body: string): Promise<{ valid: boolean; payload?: Stripe.Event | any }> {
    const sig = headers['stripe-signature'] || headers['Stripe-Signature'] || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    // TEMP LOG: print incoming signature header and a short preview of the raw body to console
    try {
      // Use the function parameters (body, headers). Avoid referencing undefined
      // variables like `rawBody` or `req` which caused the earlier logging to fail
      const bodyPreview = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)
      const host = (headers && (headers.host || headers['x-forwarded-host'])) || ''
      const url = host ? (String(host).replace(/\/+$/, '') + '/api/stripe/webhook') : 'unknown'
      // Print a single-line JSON to make log parsing easier
      console.log(JSON.stringify({ ts: new Date().toISOString(), action: 'incoming_webhook_preview', url, stripe_signature_header: sig, webhookSecretPresent: !!webhookSecret, bodyPreview }))

      // TEMP_EXTRA_DEBUG: write the exact bytes (base64) of the received body and
      // the full headers object to a tmp file so we can compare server-seen
      // payload bytes later. This is temporary and safe (no secret disclosure
      // beyond the stripe-signature header which we need to debug verification).
      try {
        const fs = await import('fs')
        const path = await import('path')
        const dbgPath = path.join(os.tmpdir(), 'stripe-webhook-raw-base64.log')
        const entry = JSON.stringify({
          ts: new Date().toISOString(),
          action: 'incoming_webhook_raw_base64',
          stripe_signature_header: sig,
          webhookSecretPresent: !!webhookSecret,
          headers: headers,
          body_base64: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)).toString('base64')
        }) + '\n'
        try { fs.appendFileSync(dbgPath, entry) } catch (e) { /* best-effort */ }
        // Also emit the same JSON to console (single-line) for remote log capture
        console.log(JSON.stringify({ ts: new Date().toISOString(), action: 'incoming_webhook_raw_base64_console', stripe_signature_header: sig, body_base64_preview: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)).toString('base64').slice(0, 200) }))
        // Additional TEMP debug: if webhookSecret present, parse signature header and
        // compute server-side HMAC for the timestamp and body and append to a separate
        // tmp log. We DO NOT log the secret itself; only the computed hex hmac and
        // parsed timestamp/v1 for comparison.
        try {
          if (webhookSecret) {
            const sigParts = String(sig).split(',').map(s => s.trim())
            const tPart = sigParts.find(p => p.startsWith('t='))
            const v1Part = sigParts.find(p => p.startsWith('v1='))
            const tsVal = tPart ? tPart.split('=')[1] : null
            const recvV1 = v1Part ? v1Part.split('=')[1] : null
            const computed = tsVal ? crypto.createHmac('sha256', String(webhookSecret)).update(`${tsVal}.${typeof body === 'string' ? body : JSON.stringify(body)}`).digest('hex') : null
            // Compute a short, non-sensitive fingerprint of the webhook secret so we can
            // detect per-instance secret parity without logging the secret itself.
            const webhookSecretFp = (() => {
              try {
                return crypto.createHash('sha256').update(String(webhookSecret)).digest('hex').slice(0, 8)
              } catch (e) {
                return null
              }
            })()
            const dbgPath2 = path.join(os.tmpdir(), 'stripe-webhook-hmac-debug.log')
            const dbgEntry2 = JSON.stringify({ ts: new Date().toISOString(), action: 'incoming_webhook_hmac_debug', parsed_timestamp: tsVal, received_v1: recvV1, computed_v1: computed ? computed : null, webhook_secret_fp: webhookSecretFp }) + '\n'
            try { fs.appendFileSync(dbgPath2, dbgEntry2) } catch (e) { /* best-effort */ }
          }
        } catch (e) { /* best-effort */ }
      } catch (e) {
        // ignore any failures writing debug artifacts
      }
    } catch (e) {
      console.log('[stripe:debug] failed to log incoming webhook preview', e)
    }
    if (!webhookSecret) {
      // No webhook secret configured: accept and parse JSON (dev only)
      const p = JSON.parse(body || '{}')
      stripeDebug('verifyWebhook: no secret configured, payload sample:', typeof p === 'object' ? Object.keys(p).slice(0,10) : String(p))
      return { valid: true, payload: p }
    }
    try {
      if (!stripe) {
        throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
      }
      const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      stripeDebug('verifyWebhook: constructed event type=', event.type, 'id=', event.id)
      return { valid: true, payload: event }
    } catch (err) {
      console.error('stripe webhook verification failed (primary header)', err)
      // Guarded fallback: some platforms/proxies may mutate or move the Stripe
      // signature header (for example into a `forwarded` param). To avoid
      // weakening security unintentionally, only attempt an alternate-header
      // re-check when explicitly enabled via STRIPE_WEBHOOK_ALLOW_ALTERNATE_HEADER.
      const allowAlternate = String(process.env.STRIPE_WEBHOOK_ALLOW_ALTERNATE_HEADER || '').toLowerCase() === 'true'
      if (!allowAlternate) {
        return { valid: false }
      }

      try {
        // Try to find an alternate signature value in other headers (common
        // places: 'forwarded' header or other proxy-provided header values).
        const hdrs = headers || {}
        const headerValues = Object.values(hdrs).filter(Boolean).map(String)
        let altSig: string | null = null
        for (const hv of headerValues) {
          // look for t=<ts>,v1=<hex> pattern anywhere in the header value
          const m = hv.match(/t=\d+,v1=[0-9a-fA-F]+/) || hv.match(/t%3D\d+%2Cv1%3D[0-9a-fA-F]+/)
          if (m) {
            // if URL-encoded, decode
            const candidate = decodeURIComponent(m[0])
            altSig = candidate
            break
          }
          // also accept a direct sig=... piece sometimes present in forwarded
          const m2 = hv.match(/sig=([^;,"]+)/)
          if (m2 && m2[1]) {
            // try to find t=... inside the sig param
            const decoded = decodeURIComponent(m2[1])
            const m3 = decoded.match(/t=\d+,v1=[0-9a-fA-F]+/)
            if (m3) { altSig = m3[0]; break }
          }
        }

        if (altSig) {
              try {
                const fs = await import('fs')
                const path = await import('path')
                const dbgPath2 = path.join(os.tmpdir(), 'stripe-webhook-hmac-debug.log')
                // log attempt to try alternate header
                try {
                  const webhookSecretFp2 = (() => {
                    try { return crypto.createHash('sha256').update(String(webhookSecret)).digest('hex').slice(0, 8) } catch (e) { return null }
                  })()
                  fs.appendFileSync(dbgPath2, JSON.stringify({ ts: new Date().toISOString(), action: 'attempt_alternate_sig_header', usedAltSig: altSig, webhook_secret_fp: webhookSecretFp2 }) + '\n')
                } catch (e) { /* best-effort */ }
                const _stripe = stripe as Stripe
                const eventAlt = _stripe.webhooks.constructEvent(body, altSig, webhookSecret)
                stripeDebug('verifyWebhook: constructed event with alternate header, type=', eventAlt.type, 'id=', eventAlt.id)
                return { valid: true, payload: eventAlt }
              } catch (altErr) {
                console.error('stripe webhook verification failed (alternate header) ', altErr)
                return { valid: false }
              }
        }
      } catch (outerErr) {
        console.error('stripe webhook alternate-header attempt failed:', outerErr)
      }

      return { valid: false }
    }
  },

  async handleWebhookEvent(event: Stripe.Event | unknown) {
    // Type guard for Stripe.Event
    function isStripeEvent(obj: unknown): obj is Stripe.Event {
      return !!obj && typeof obj === 'object' && 'id' in (obj as Record<string, unknown>) && 'type' in (obj as Record<string, unknown>)
    }

    const eventLocal: Stripe.Event | any = isStripeEvent(event) ? (event as Stripe.Event) : (event as any)

    console.log('stripe webhook event received:', eventLocal?.type || '(no type)', {
      eventId: eventLocal?.id,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    })
    stripeDebug('raw payload keys:', eventLocal && typeof eventLocal === 'object' ? Object.keys(eventLocal).slice(0,10) : String(eventLocal))

    // normalize payload for local typed access (declare early so catch blocks can reference)
    const payloadAny = event as Record<string, unknown> | undefined
    // provide legacy `payload` variable used throughout the handler
  const payload: Record<string, unknown> | undefined = eventLocal as Record<string, unknown>

    if (!eventLocal?.id || !eventLocal?.type) {
      console.warn('[stripe] invalid webhook payload: missing id or type')
      return
    }

    try {
      // データベース接続テスト
      console.log('[stripe] testing database connection...')
      try {
        await prisma.$queryRaw`SELECT 1`
        console.log('[stripe] database connection OK')
      } catch (dbTestErr: any) {
        console.error('[stripe] database connection test failed:', {
          code: dbTestErr?.code,
          message: dbTestErr?.message,
          timestamp: new Date().toISOString()
        })
        throw new Error(`Database connection failed: ${dbTestErr?.message}`)
      }


    // 1) 最初に upsert でイベントを登録または保持する（冪等性確保）
      // upsert は競合回避に有用で、同一イベントの複数同時配信でも安全に動作します。
      try {
        await prisma.stripeEvent.upsert({
          where: { id: eventLocal.id },
          create: { id: eventLocal.id, type: eventLocal.type, payload: eventLocal as unknown as Prisma.InputJsonValue, processed: false },
          update: { payload: eventLocal as unknown as Prisma.InputJsonValue }
        })
      } catch (upsertErr: unknown) {
        // upsert が P2002 (unique constraint) を投げることは通常ないが、
        // 競合や並列処理のタイミングによって発生し得るため、
        // 明示的に無害化して続行する。
        const ue = upsertErr as Record<string, unknown>
        const isP2002 = ue && (ue as any).code === 'P2002'
        if (isP2002) {
          console.warn('[stripe] stripeEvent upsert race/duplicate (P2002) - ignoring:', payload && (payload as any).id)
        } else {
          console.warn('[stripe] stripeEvent upsert warning:', upsertErr)
        }
      }

      // 再チェック：もし既に processed=true なら二重処理を避ける
      const existing = await prisma.stripeEvent.findUnique({ where: { id: eventLocal.id } })
      if (existing && existing.processed) {
        console.log('[stripe] event already processed (skip):', eventLocal.id)
        return
      }

    // 2) checkout.session.completed の場合は注文とペイメントを作成
    if (payload.type === 'checkout.session.completed') {
  const payloadObj: Record<string, unknown> | undefined = getPayloadObject(payloadAny)
  const payloadMetadataForLocal = getPayloadMetadata(payloadAny)
      const sessionFetch = async () => {
        const sessionId = payloadObj?.id
        stripeDebug('checkout.session.completed payload.data.object keys:', payloadObj && typeof payloadObj === 'object' ? Object.keys(payloadObj).slice(0,20) : String(payloadObj))
        if (!sessionId) return { session: null as ExpandedCheckoutSession | null, sessionId: undefined, recoveredFromPayload: false }

        // Extracted to a helper below
        return await fetchExpandedSession(sessionId as string, payloadAny as unknown)
      }

          const { session: fetchedSession, sessionId } = await sessionFetch()
            if (!sessionId) {
              // nothing to do
            } else {
          // attach session variable into local scope
          const _session = fetchedSession as ExpandedCheckoutSession | null
          const sessionLocal: ExpandedCheckoutSession | null = _session
          const session = sessionLocal as ExpandedCheckoutSession
          const s = session
            // existingOrderId: try metadata on session then payload metadata as fallback
            let existingOrderId: string | undefined = undefined
            try {
              existingOrderId = (s && s.metadata && s.metadata.orderId) ? String(s.metadata.orderId) : (payloadMetadataForLocal && payloadMetadataForLocal.orderId ? String(payloadMetadataForLocal.orderId) : undefined)
            } catch (e) {
              existingOrderId = undefined
            }

            // customer details retrieval is unchanged
            let customerDetails: Record<string, unknown> | undefined = undefined
            if (s && s.customer_details && typeof s.customer_details === 'object') {
              customerDetails = s.customer_details as unknown as Record<string, unknown>
            }
            if ((!customerDetails || !customerDetails.name || !customerDetails.phone) && s && s.customer) {
              try {
                const custId = extractCustomerIdFromSessionCustomer(s.customer)
                if (custId && stripe) {
                  const fullCustomer = await stripe!.customers.retrieve(custId)
                  if (fullCustomer && typeof fullCustomer === 'object') {
                    customerDetails = customerDetails || {}
                    const fc = fullCustomer as unknown as Record<string, unknown>
                    if (!customerDetails.name && typeof fc.name === 'string') customerDetails.name = fc.name
                    if (!customerDetails.email && typeof fc.email === 'string') customerDetails.email = fc.email
                    if (!customerDetails.phone && typeof fc.phone === 'string') customerDetails.phone = fc.phone
                    if (!customerDetails.address && fc.address && typeof fc.address === 'object') customerDetails.address = fc.address as Record<string, unknown>
                  }
                }
              } catch (custErr) {
                console.warn('[stripe] could not retrieve full customer from Stripe:', custErr)
              }
            }

            // Stripe Customer IDをUserテーブルに保存（email が判明している場合）
            // また、見つかったユーザーを注文に紐付けるための matchedUserId を保持する
            let matchedUserId: string | undefined = undefined
            const custIdForUserRaw = s.customer
            const custIdForUser = extractCustomerIdFromSessionCustomer(custIdForUserRaw)
            const custEmailForUser = (typeof customerDetails?.email === 'string' ? customerDetails!.email as string : extractCustomerEmail(s.customer))
            stripeDebug('resolved customer for user:', { custIdForUser, custEmailForUser })
            // Extra tracing to help diagnose why user matching may fail in local tests
              try {
              console.log('[stripe][trace] session.customer:', typeof s.customer === 'string' ? s.customer : (s.customer && typeof s.customer === 'object' ? { id: (s.customer as any).id, email: (s.customer as any).email } : s.customer))
              console.log('[stripe][trace] session.customer_details:', s.customer_details)
              console.log('[stripe][trace] session.metadata:', s.metadata)
              console.log('[stripe][trace] payload.data.object.metadata:', payloadObj?.metadata)
            } catch (traceErr) {
              console.warn('[stripe][trace] failed to print trace info:', traceErr)
            }
            if (custIdForUser && custEmailForUser) {
              try {
                // Use case-insensitive email match and prefer metadata/email sources as fallbacks
                const resolvedEmail = (custEmailForUser || s.metadata?.userEmail || (payloadMetadataForLocal && payloadMetadataForLocal.userEmail) ) as string
                console.log('[stripe][trace] attempting prisma.user.findFirst by email (insensitive):', resolvedEmail)
                const existingUser = await prisma.user.findFirst({ where: { email: { equals: resolvedEmail, mode: 'insensitive' } } })
                if (existingUser) {
                  matchedUserId = existingUser.id
                  const updateData: any = { stripeCustomerId: custIdForUser }
                  await withRetries(() => prisma.user.update({
                    where: { id: existingUser.id },
                    data: updateData
                  }))
                  console.log('[stripe] saved customer ID for user:', resolvedEmail, custIdForUser)
                 // --- Stripe決済完了時にサーバ側でカートを削除 ---
                 try {
                   console.log('[stripe][trace] about to delete cartItems for userId:', existingUser.id)
                   const deleted = await prisma.cartItem.deleteMany({ where: { userId: existingUser.id } })
                   console.log('[stripe] サーバ側でカートを削除:', { userId: existingUser.id, email: existingUser.email, deletedCount: deleted.count })
                 } catch (cartDelErr) {
                   console.error('[stripe] サーバ側カート削除失敗:', cartDelErr)
                 }
                } else {
                  console.log('[stripe] user not found by email, skipping user update for email:', custEmailForUser)
                  // Dump current users count for visibility (non-sensitive):
                  try {
                    const c = await prisma.user.count({ where: { email: custEmailForUser } })
                    console.log('[stripe][trace] prisma.user.count for email result:', c)
                  } catch (countErr) {
                    console.warn('[stripe][trace] could not count users for email:', countErr)
                  }
                }
              } catch (userUpdateError) {
                console.warn('[stripe] could not update user with customer ID:', userUpdateError)
                // エラーでも決済処理は続行する
              }
            } else if (custIdForUser) {
              // stripeCustomerId で user を特定できる場合もカート削除を試みる
              try {
                console.log('[stripe][trace] attempting prisma.user.findUnique by stripeCustomerId:', custIdForUser)
                const userByStripeId = await prisma.user.findUnique({ where: { stripeCustomerId: custIdForUser } })
                if (userByStripeId) {
                  matchedUserId = userByStripeId.id
                  console.log('[stripe][trace] found user by stripeCustomerId:', { id: userByStripeId.id, email: userByStripeId.email })
                  const deleted = await prisma.cartItem.deleteMany({ where: { userId: userByStripeId.id } })
                  console.log('[stripe] サーバ側でカートを削除 (stripeCustomerId):', { userId: userByStripeId.id, email: userByStripeId.email, deletedCount: deleted.count })
                } else {
                  console.log('[stripe][trace] no user found by stripeCustomerId:', custIdForUser)
                }
              } catch (cartDelErr) {
                console.error('[stripe] サーバ側カート削除失敗 (stripeCustomerId):', cartDelErr)
              }
            } else if (custEmailForUser) {
              // email だけで user を特定できる場合
              try {
                // Use case-insensitive lookup for fallback email as well
                const resolvedFallbackEmail = (custEmailForUser || s.metadata?.userEmail || (payloadMetadataForLocal && payloadMetadataForLocal.userEmail) ) as string
                console.log('[stripe][trace] attempting prisma.user.findFirst by email (fallback, insensitive):', resolvedFallbackEmail)
                const userByEmail = await prisma.user.findFirst({ where: { email: { equals: resolvedFallbackEmail, mode: 'insensitive' } } })
                if (userByEmail) {
                  matchedUserId = userByEmail.id
                  console.log('[stripe][trace] found user by email (fallback):', { id: userByEmail.id })
                  const deleted = await prisma.cartItem.deleteMany({ where: { userId: userByEmail.id } })
                  console.log('[stripe] サーバ側でカートを削除 (email):', { userId: userByEmail.id, email: userByEmail.email, deletedCount: deleted.count })
                } else {
                  console.log('[stripe][trace] no user found by email (fallback):', custEmailForUser)
                }
              } catch (cartDelErr) {
                console.error('[stripe] サーバ側カート削除失敗 (email):', cartDelErr)
              }
            }

            // 住所情報を組み立て（customer_details または full customer/address から取得）
            let shippingAddress = ''
            const addrSource = getAddressFromUnknown(customerDetails?.address)
            stripeDebug('address source normalized:', addrSource)
            if (addrSource) {
              shippingAddress = [
                addrSource.postal_code,
                addrSource.state,
                addrSource.city,
                addrSource.line1,
                addrSource.line2
              ].filter(Boolean).join(' ')
            }

            // フロントから渡された metadata に配送先情報がある場合はフォールバックとして使う
            const metadataFromSession = s.metadata || payloadMetadataForLocal || {}
            const metaShippingAddr = typeof (metadataFromSession as Record<string, unknown>).shippingAddress === 'string' ? (metadataFromSession as Record<string, unknown>).shippingAddress : undefined
            if (!shippingAddress && metaShippingAddr) {
              shippingAddress = String(metaShippingAddr).trim()
            }

            // Stripe顧客情報をCheckout画面の配送先で上書き
            // shipping_details may be present on the expanded session
            const sessionShippingDetails = getSessionShippingDetails(s)
            // Always prefer the session's shipping_details when available. Previously we only
            // used session shipping when shippingAddress was empty, which could ignore the
            // buyer-entered line1/line2 at checkout if a partial address existed from
            // customer_details or metadata. Overwrite shippingAddress with the session's
            // shipping address when present so payment-time authoritative pieces are kept.
            if (sessionShippingDetails && sessionShippingDetails.address) {
              const addr = sessionShippingDetails.address
              const built = [addr.postal_code, addr.state, addr.city, addr.line1, addr.line2].filter(Boolean).join(' ')
              if (built) shippingAddress = built
            }
            if (s.customer && sessionShippingDetails && sessionShippingDetails.address) {
              try {
                const custId = extractCustomerIdFromSessionCustomer(s.customer)
                if (custId) {
                  const addr = sessionShippingDetails.address || {} as any
                  const updatePayload: Stripe.CustomerUpdateParams = {
                    address: {
                      line1: addr.line1 || undefined,
                      line2: addr.line2 || undefined,
                      postal_code: addr.postal_code || undefined,
                      city: addr.city || undefined,
                      state: addr.state || undefined,
                      country: (addr as any).country || 'JP'
                    }
                  }
                  if (sessionShippingDetails.name) updatePayload.name = sessionShippingDetails.name
                  if (sessionShippingDetails.phone) updatePayload.phone = sessionShippingDetails.phone
                  if (stripe) await stripe.customers.update(custId, updatePayload)
                  console.log('[stripe] 顧客情報をCheckout配送先で上書き:', custId, updatePayload)
                }
              } catch (err) {
                console.warn('[stripe] 顧客情報の配送先上書き失敗:', err)
              }
            }

            // 注文を作成または既存注文の更新（metadata.orderId があれば更新）
            const shippingCost = s ? s.shipping_cost?.amount_total || 0 : 0

            // payment_intent は expand しているためオブジェクト／文字列どちらの可能性もある
            const paymentIntentRaw: unknown = s.payment_intent
            const paymentIntentId = getIdFromUnknown(paymentIntentRaw)
            stripeDebug('[stripe] payment_intent raw type:', typeof paymentIntentRaw, 'resolved id:', paymentIntentId)

            // 既存注文IDがセッションのmetadataにあれば、その注文を paid に更新して使う
            // 追加: まず paymentIntentId（または chargeId）から既存の Payment を探し、それに紐づく Order を優先して利用する
            // これは同一支払いが複数回 webhook を送る/処理されるケースでの重複 Order 作成を防ぐための冪等性強化です。
            // Resolve or create order using helper
            let { order } = await resolveOrCreateOrder(s, payload, matchedUserId, shippingAddress, paymentIntentId, sessionId)

            // Search for any order already referencing this sessionId in notes
            try {
              const ordersWithSession = await prisma.order.findMany({ where: { notes: { contains: sessionId } }, take: 1 })
              if (ordersWithSession && ordersWithSession.length > 0) {
                console.log('[stripe] found existing order by session notes, reusing order:', ordersWithSession[0].id)
                // treat as existingOrderId
                
                try {
                  const found = await prisma.order.findUnique({ where: { id: ordersWithSession[0].id } })
                  if (found) {
                    const finalCustomerEmail = getStringFromRecord(customerDetails, 'email') || extractCustomerEmail(s.customer) || found.customerEmail
                    const cdName = getStringFromRecord(customerDetails, 'name')
                    const sessionName = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).name === 'string') ? (s.customer as Stripe.Customer).name : undefined
                    const dbName = found.customerName ?? ''
                    const finalCustomerName: string = cdName ?? sessionName ?? dbName
                    const cdPhone = getStringFromRecord(customerDetails, 'phone')
                    const sessionPhone = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).phone === 'string') ? (s.customer as Stripe.Customer).phone : undefined
                    const dbPhone = found.customerPhone ?? ''
                    const finalCustomerPhone: string = cdPhone ?? sessionPhone ?? dbPhone
                      const metaExpectedTotal2 = s.metadata && s.metadata.expectedTotal ? parseInt(String(s.metadata.expectedTotal)) : undefined
                      const resolvedTotalForNotesUpdate = metaExpectedTotal2 || s.amount_total || found.totalAmount
                      if (metaExpectedTotal2 && metaExpectedTotal2 !== (s.amount_total || 0)) {
                        console.warn('[stripe] metadata.expectedTotal differs from session.amount_total (notes match); using metadata as source-of-truth', { sessionId, metaExpectedTotal2, sessionAmount: s.amount_total })
                      }
                    // Prefer structured shipping_details from the session when available,
                    // otherwise fall back to shippingAddress / found.shippingAddress / user.address
                    const sessionAddrObj = sessionShippingDetails && sessionShippingDetails.address ? sessionShippingDetails.address : undefined
                    const sessionAddrCandidate = sessionAddrObj ? [sessionAddrObj.postal_code, sessionAddrObj.state, sessionAddrObj.city, sessionAddrObj.line1, sessionAddrObj.line2].filter(Boolean).join(' ') : undefined
                    const addrPartsNotes = splitJapaneseAddress(sessionAddrCandidate || shippingAddress || found.shippingAddress || (found.userId ? ((found as unknown) as { user?: { address?: string } }).user?.address : undefined))
                    const updateForNotes: any = {
                      status: 'paid',
                      totalAmount: resolvedTotalForNotesUpdate,
                      subtotal: resolvedTotalForNotesUpdate - shippingCost,
                      shippingFee: shippingCost,
                      customerEmail: finalCustomerEmail,
                      customerName: finalCustomerName,
                      customerPhone: finalCustomerPhone,
                      shippingAddress: shippingAddress || found.shippingAddress,
                      notes: `Stripe Session ID: ${sessionId}`,
                      preCreated: false,
                      userId: matchedUserId ? matchedUserId : undefined
                    }
                    // If we have a structured session address, prefer its individual pieces
                    if (sessionAddrObj) {
                      if (sessionAddrObj.state && !found.shippingPrefecture) updateForNotes.shippingPrefecture = sessionAddrObj.state
                      if (sessionAddrObj.city && !found.shippingCity) updateForNotes.shippingCity = sessionAddrObj.city
                      const rest = [sessionAddrObj.line1, sessionAddrObj.line2].filter(Boolean).join(' ')
                      if (rest && !found.shippingRest) updateForNotes.shippingRest = rest
                    } else {
                      if (addrPartsNotes?.prefecture && !found.shippingPrefecture) updateForNotes.shippingPrefecture = addrPartsNotes.prefecture
                      if (addrPartsNotes?.city && !found.shippingCity) updateForNotes.shippingCity = addrPartsNotes.city
                      if (addrPartsNotes?.rest && !found.shippingRest) updateForNotes.shippingRest = addrPartsNotes.rest
                    }
                    order = await withRetries(() => prisma.order.update({ where: { id: found.id }, data: updateForNotes }))
                    console.log('[stripe] updated existing order to paid (by notes):', found.id)
                      // Log address sources for notes-based update
                      const addressSourcesNotes: Record<string, string | undefined> = {
                        shippingAddress: sessionAddrObj ? 'session.shipping_details' : (shippingAddress ? 'shippingAddress_candidate' : (found && found.shippingAddress ? 'existing_order' : undefined)),
                        prefecture: sessionAddrObj && sessionAddrObj.state ? 'session.shipping_details' : (addrPartsNotes && addrPartsNotes.prefecture ? 'parsed_candidate' : undefined),
                        city: sessionAddrObj && sessionAddrObj.city ? 'session.shipping_details' : (addrPartsNotes && addrPartsNotes.city ? 'parsed_candidate' : undefined),
                        rest: sessionAddrObj && (sessionAddrObj.line1 || sessionAddrObj.line2) ? 'session.shipping_details' : (addrPartsNotes && addrPartsNotes.rest ? 'parsed_candidate' : undefined)
                      }
                      console.log('[stripe][address-sources][notes-match]', { sessionId, orderId: found.id, addressSources: addressSourcesNotes })
                  }
                } catch (err) {
                  console.warn('[stripe] could not update existing order found by notes:', err)
                }
              }
            } catch (noteSearchErr) {
              console.warn('[stripe] error searching for existing order by session notes:', noteSearchErr)
            }

            // fallback to metadata.orderId if not found by notes
            if (!order && existingOrderId) {
              try {
                const found = await prisma.order.findUnique({ where: { id: existingOrderId } })
                if (found) {
                  const finalCustomerEmail = getStringFromRecord(customerDetails, 'email') || extractCustomerEmail(s.customer) || found.customerEmail
                  const cdName = getStringFromRecord(customerDetails, 'name')
                  const sessionName = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).name === 'string') ? (s.customer as Stripe.Customer).name : undefined
                  const dbName = found.customerName ?? ''
                  const finalCustomerName: string = cdName ?? sessionName ?? dbName
                  const cdPhone = getStringFromRecord(customerDetails, 'phone')
                  const sessionPhone = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).phone === 'string') ? (s.customer as Stripe.Customer).phone : undefined
                  const dbPhone = found.customerPhone ?? ''
                  const finalCustomerPhone: string = cdPhone ?? sessionPhone ?? dbPhone
                  const metaExpectedTotal3 = s.metadata && s.metadata.expectedTotal ? parseInt(String(s.metadata.expectedTotal)) : undefined
                  const resolvedTotalForMetaUpdate = metaExpectedTotal3 || s.amount_total || found.totalAmount
                  if (metaExpectedTotal3 && metaExpectedTotal3 !== (s.amount_total || 0)) {
                    console.warn('[stripe] metadata.expectedTotal differs from session.amount_total (metadata.orderId update); using metadata', { sessionId, metaExpectedTotal3, sessionAmount: s.amount_total })
                  }
                  // Prefer structured shipping details from session when available; fall back to parsed address
                  const addrSrcForMeta = getAddressFromUnknown((s && s.customer_details) ? (s.customer_details as unknown as Record<string, unknown>)['address'] : undefined)
                  const payloadMetadataForMeta = getPayloadMetadata(payloadAny)
                  const metaPostalForMeta = s && s.metadata && (s.metadata.postalCode || s.metadata.postal_code) ? String(s.metadata.postalCode || s.metadata.postal_code) : (payloadMetadataForMeta && (payloadMetadataForMeta.postalCode || payloadMetadataForMeta.postal_code) ? String(payloadMetadataForMeta.postalCode || payloadMetadataForMeta.postal_code) : undefined)
                  const sessionShippingAddrForMeta = (s && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details && (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address) ? (s as ExpandedCheckoutSession & { shipping_details?: { address?: Record<string, unknown> } }).shipping_details!.address : undefined
                  const resolvedPostalForMeta = (addrSrcForMeta && addrSrcForMeta.postal_code) ? addrSrcForMeta.postal_code : (metaPostalForMeta ? metaPostalForMeta : (sessionShippingAddrForMeta && sessionShippingAddrForMeta.postal_code ? sessionShippingAddrForMeta.postal_code : undefined))
                  const sessionAddrObjForMeta = sessionShippingDetails && sessionShippingDetails.address ? sessionShippingDetails.address as Record<string, string> : undefined
                  const sessionAddrCandidateMeta = sessionAddrObjForMeta ? [sessionAddrObjForMeta.postal_code, sessionAddrObjForMeta.state, sessionAddrObjForMeta.city, sessionAddrObjForMeta.line1, sessionAddrObjForMeta.line2].filter(Boolean).join(' ') : undefined
                  const addrPartsMeta = splitJapaneseAddress(sessionAddrCandidateMeta || shippingAddress || found.shippingAddress || (found.userId ? ((found as unknown) as { user?: { address?: string } }).user?.address : undefined))

                  // Build an update object and only set shipping pieces when the
                  // existing order does not already contain them. This prevents
                  // overwriting explicit user-entered address pieces with
                  // session-derived or parsed values.
                  const updateDataForMeta: any = {}
                  updateDataForMeta.status = 'paid'
                  updateDataForMeta.totalAmount = resolvedTotalForMetaUpdate
                  updateDataForMeta.subtotal = resolvedTotalForMetaUpdate - shippingCost
                  updateDataForMeta.shippingFee = shippingCost
                  updateDataForMeta.customerEmail = finalCustomerEmail
                  updateDataForMeta.customerName = finalCustomerName
                  updateDataForMeta.customerPhone = finalCustomerPhone
                  updateDataForMeta.shippingAddress = shippingAddress || found.shippingAddress
                  updateDataForMeta.postalCode = resolvedPostalForMeta || ((found as unknown as { postalCode?: string }).postalCode)
                  updateDataForMeta.notes = `Stripe Session ID: ${sessionId}`
                  updateDataForMeta.preCreated = false
                  if (matchedUserId) updateDataForMeta.userId = matchedUserId
                  if (sessionAddrObjForMeta) {
                    if (sessionAddrObjForMeta.state && !found.shippingPrefecture) updateDataForMeta.shippingPrefecture = sessionAddrObjForMeta.state
                    if (sessionAddrObjForMeta.city && !found.shippingCity) updateDataForMeta.shippingCity = sessionAddrObjForMeta.city
                    const rest = [sessionAddrObjForMeta.line1, sessionAddrObjForMeta.line2].filter(Boolean).join(' ')
                    if (rest && !found.shippingRest) updateDataForMeta.shippingRest = rest
                  } else {
                    if (addrPartsMeta?.prefecture && !found.shippingPrefecture) updateDataForMeta.shippingPrefecture = addrPartsMeta.prefecture
                    if (addrPartsMeta?.city && !found.shippingCity) updateDataForMeta.shippingCity = addrPartsMeta.city
                    if (addrPartsMeta?.rest && !found.shippingRest) updateDataForMeta.shippingRest = addrPartsMeta.rest
                  }

                  order = await withRetries(() => prisma.order.update({ where: { id: existingOrderId }, data: updateDataForMeta }))
                  console.log('[stripe] updated existing order to paid (by metadata.orderId):', existingOrderId)
                }
              } catch (err) {
                console.warn('[stripe] could not update existing order (by metadata.orderId):', err)
              }
            }

            // 見つからなければ新規作成
            if (!order) {
              let finalCustomerEmail: string = ''
              let finalCustomerName: string = ''
              let finalCustomerPhone: string = ''

              try {
                finalCustomerEmail = getStringFromRecord(customerDetails, 'email') || extractCustomerEmail(s.customer) || ''
                const cdName = getStringFromRecord(customerDetails, 'name')
                const sessionName = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).name === 'string') ? (s.customer as Stripe.Customer).name : undefined
                finalCustomerName = cdName ?? sessionName ?? ''
                const cdPhone = getStringFromRecord(customerDetails, 'phone')
                const sessionPhone = (s.customer && typeof s.customer === 'object' && typeof (s.customer as Stripe.Customer).phone === 'string') ? (s.customer as Stripe.Customer).phone : undefined
                finalCustomerPhone = cdPhone ?? sessionPhone ?? ''

                const metaExpectedTotalNew = s.metadata && s.metadata.expectedTotal ? parseInt(String(s.metadata.expectedTotal)) : undefined
                const resolvedTotalForCreate = metaExpectedTotalNew || s.amount_total || 0
                if (metaExpectedTotalNew && metaExpectedTotalNew !== (s.amount_total || 0)) {
                  console.warn('[stripe] metadata.expectedTotal differs from session.amount_total (creating new order); using metadata as source-of-truth', { sessionId, metaExpectedTotalNew, sessionAmount: s.amount_total })
                }
                const addrPartsCreate = splitJapaneseAddress(shippingAddress || (s && s.metadata && s.metadata.shippingAddress) || undefined)
                  order = await withRetries(() => prisma.order.create({
                  data: ({
                    totalAmount: resolvedTotalForCreate,
                    currency: s.currency || 'jpy',
                    status: 'paid',
                    customerEmail: finalCustomerEmail,
                    customerName: finalCustomerName,
                    customerPhone: finalCustomerPhone,
                              // Use shippingAddress (possibly from metadata) when creating new order
                              shippingAddress: shippingAddress || '',
                              shippingPrefecture: addrPartsCreate.prefecture || undefined,
                              shippingCity: addrPartsCreate.city || undefined,
                              shippingRest: addrPartsCreate.rest || undefined,
                    subtotal: (s.amount_total || 0) - shippingCost,
                    shippingFee: shippingCost,
                    notes: `Stripe Session ID: ${sessionId}`,
                    userId: matchedUserId ? matchedUserId : undefined
                  } as Prisma.OrderUncheckedCreateInput)
                }))
              } catch (orderCreateErr: any) {
                console.error('[stripe][webhook][order-create] error creating order', {
                  eventId: payload.id,
                  sessionId,
                  existingOrderId: existingOrderId,
                  paymentIntentId,
                  sessionAmount: s.amount_total,
                  sessionCurrency: s.currency,
                  customerEmail: finalCustomerEmail || 'undefined',
                  customerName: finalCustomerName || 'undefined',
                  customerPhone: finalCustomerPhone || 'undefined',
                  shippingAddress: shippingAddress || '',
                  errCode: orderCreateErr?.code,
                  errMessage: orderCreateErr?.message,
                  errMeta: orderCreateErr?.meta,
                  errStack: orderCreateErr?.stack,
                  timestamp: new Date().toISOString()
                })
                throw orderCreateErr
              }
            }

            // ペイメントを作成（paymentIntentId を正しく保存）
            // payment_intent が無い、または paymentIntentId が空の場合は
            // session.payment_intent.latest_charge / charges 配列などから代替のIDを取得する
              let resolvedStripeId: string | undefined = paymentIntentId
            try {
              if (!resolvedStripeId) {
                const piRaw: unknown = s.payment_intent
                const chargeId = getChargeIdFromPaymentIntent(piRaw)
                stripeDebug('resolved chargeId from payment_intent candidate:', chargeId)
                if (chargeId) resolvedStripeId = chargeId
              }
            } catch (resolveErr) {
              console.warn('[stripe] could not resolve stripe id from session/payment_intent:', resolveErr)
            }

            // --- Ensure OrderItems exist: if the webhook-created/updated order has no items,
            //     try to populate from expanded session.line_items
            try {
              if (!order) {
                console.warn('[stripe] skipping orderItems creation: order is null')
              } else {
                const existingItems = await prisma.orderItem.findMany({ where: { orderId: order.id } })
                const rawLineItems = getSessionLineItems(s)
                if ((existingItems.length === 0 || existingItems == null) && rawLineItems.length > 0) {
                  const itemsToCreate = rawLineItems.map((li: ExpandedLineItem) => {
                    const qty = li.quantity || 1
                    const p = li.price as ExpandedLineItemPrice | undefined
                    const unitAmount = (p && typeof p.unit_amount === 'number') ? p.unit_amount : (li.amount_subtotal || (li as any).amount || 0)
                    let prodId: string | undefined = undefined
                    try {
                      if (p && typeof p === 'object') {
                        const meta = p.metadata as Record<string, string> | undefined
                        if (meta && (meta.productId || meta.product_id || meta.sku)) {
                          prodId = meta.productId || meta.product_id || meta.sku
                        }
                        if (!prodId && p.product && typeof p.product === 'string') prodId = p.product
                      }
                    } catch (e) {
                      // ignore
                    }
                    if (!prodId) prodId = li.description || `stripe_lineitem_${li.id}`

                    return {
                      orderId: order.id,
                      productId: String(prodId), // temporary candidate, will map to real Product.id below
                      quantity: qty,
                      unitPrice: Math.round(unitAmount || 0),
                      totalPrice: Math.round((unitAmount || 0) * qty)
                    }
                  })

                  // Attempt to map candidate product identifiers to internal Product.id values.
                  // If a matching Product cannot be found, create a placeholder Product so FK constraint is satisfied.
                  try {
                    console.log('[stripe] about to map product candidates for orderItems - orderId:', order.id, 'candidates:', itemsToCreate.map(i => i.productId))
                    for (let i = 0; i < itemsToCreate.length; i++) {
                      const candidate = itemsToCreate[i].productId
                      try {
                        // Try to find existing product by id (most likely when metadata carried internal id)
                        let found: any = null
                        try {
                          found = await prisma.product.findUnique({ where: { id: String(candidate) } })
                        } catch (e) {
                          // ignore lookup errors
                        }

                        if (found && found.id) {
                          itemsToCreate[i].productId = found.id
                          continue
                        }

                        // Try to find an existing placeholder created earlier for this Stripe candidate
                        try {
                          const existingPlaceholder = await prisma.product.findFirst({ where: { description: { contains: `imported_from_stripe:${String(candidate)}` } } })
                          if (existingPlaceholder && existingPlaceholder.id) {
                            console.log('[stripe] reusing existing placeholder for candidate:', candidate, '->', existingPlaceholder.id)
                            itemsToCreate[i].productId = existingPlaceholder.id
                            continue
                          }
                        } catch (e) {
                          // ignore lookup errors and proceed to create
                        }

                        // No product found by id or placeholder -> create a placeholder product using available info
                        const li = rawLineItems[i] || {}
                        const name = (li.description && typeof li.description === 'string') ? li.description : `Imported from Stripe (${String(candidate).slice(0,12)})`
                        const priceVal = Math.round(itemsToCreate[i].unitPrice || 0)
                        const placeholder = await prisma.product.create({ data: { name: name, description: `imported_from_stripe:${String(candidate)}`, price: priceVal } })
                        console.log('[stripe] created placeholder product for stripe candidate:', candidate, '->', placeholder.id)
                        itemsToCreate[i].productId = placeholder.id
                      } catch (mapErr) {
                        console.warn('[stripe] failed mapping/creating product for candidate:', candidate, mapErr)
                        // leave candidate as-is; createMany will likely fail but we will catch and log below
                      }
                    }
                  } catch (mapAllErr) {
                    console.warn('[stripe] product mapping phase failed for order:', order.id, mapAllErr)
                  }

                  try {
                    console.log('[stripe] about to create orderItems - orderId:', order.id, 'itemsToCreate.length:', itemsToCreate.length)
                    console.log('[stripe] itemsToCreate sample:', itemsToCreate.map((i: any) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice })).slice(0,50))
                      try {
                      const fs = await import('fs')
                      const path = await import('path')
                      const dbgPath = path.join(os.tmpdir(), 'stripe-handler-debug.log')
                      const dbgEntry = JSON.stringify({ ts: new Date().toISOString(), action: 'about_to_create_order_items', orderId: order.id, itemsPreview: itemsToCreate.slice(0,10) }) + '\n'
                      fs.appendFileSync(dbgPath, dbgEntry)
                    } catch (e) { /* ignore */ }
                    const createResult = await withRetries(() => prisma.orderItem.createMany({ data: itemsToCreate }))
                    console.log('[stripe] createMany result for orderItems:', { orderId: order.id, result: createResult, createdCount: createResult?.count ?? null })
                    try {
                      const fs = await import('fs')
                      const path = await import('path')
                      const dbgPath = path.join(os.tmpdir(), 'stripe-handler-debug.log')
                      const dbgEntry = JSON.stringify({ ts: new Date().toISOString(), action: 'created_order_items', orderId: order.id, result: createResult }) + '\n'
                      fs.appendFileSync(dbgPath, dbgEntry)
                    } catch (e) { /* ignore */ }
                    console.log('[stripe] created orderItems from session.line_items for order:', order.id, { count: itemsToCreate.length })
                    } catch (createItemsErr) {
                    console.warn('[stripe] failed to create orderItems from line_items:', createItemsErr)
                    try {
                      console.error('[stripe] createItemsErr stack:', getErrorStack(createItemsErr) ?? String(createItemsErr))
                    } catch (e) { /* ignore */ }
                      try {
                      const fs = await import('fs')
                      const path = await import('path')
                      const errLogPath = path.join(os.tmpdir(), 'stripe-webhook-errors.jsonl')
                      const errEntry = JSON.stringify({
                        kind: 'create_order_items_failed',
                        timestamp: new Date().toISOString(),
                        eventId: payload?.id,
                        sessionId,
                        orderId: order?.id,
                        itemsSample: Array.isArray(itemsToCreate) ? itemsToCreate.slice(0, 10) : undefined,
                        error: {
                          message: getErrorMessage(createItemsErr) ?? String(createItemsErr),
                          code: (createItemsErr as any)?.code ?? null,
                          meta: (createItemsErr as any)?.meta ?? null,
                          stack: getErrorStack(createItemsErr)
                        }
                      }) + '\n'
                      fs.appendFileSync(errLogPath, errEntry)
                    } catch (logErr) {
                      console.warn('[stripe] failed to write createItemsErr to tmp log:', logErr)
                    }
                  }
                }
              }
            } catch (itemsCheckErr) {
              console.warn('[stripe] could not ensure orderItems from session.line_items:', itemsCheckErr)
            }

            try {
                    const payment = await withRetries(() => prisma.payment.create({
                data: {
                  orderId: order!.id,
                  stripeId: resolvedStripeId || undefined,
                  amount: s.amount_total || 0,
                  currency: s.currency || 'jpy',
                  status: 'succeeded'
                }
              }))
              const paymentAny = payment as { id?: string; stripeId?: string } | any
              if (!order) throw new Error('order not set after create/update')
              console.log('[stripe] created order and payment for session:', sessionId, {
                customerEmail: customerDetails?.email,
                customerName: customerDetails?.name,
                customerPhone: customerDetails?.phone,
                    shippingAddress: shippingAddress || '',
                orderId: order.id,
                paymentId: paymentAny.id,
                stripeId: paymentAny.stripeId,
                timestamp: new Date().toISOString()
              })

              // 決済完了後に配送を作成
              try {
          const deliveryService = s.metadata?.deliveryService || 'japanpost'
        const weightGrams = parseInt(s.metadata?.weightGrams || '500')
        const postalCode = s.metadata?.postalCode || ''

                if (shippingAddress && postalCode) {
                  console.log('[stripe] creating delivery for order:', order.id, {
                    deliveryService,
                    weightGrams,
                    shippingAddress,
                    postalCode
                  })

                  const deliveryResponse = await fetch(`${config.NEXTAUTH_URL || config.getBaseUrl()}/api/delivery/create`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      courierId: deliveryService,
                      serviceCode: deliveryService === 'yamato' ? 'yamato_standard' : 'japanpost_standard',
                      origin: {
                        postalCode: '100-0001', // 仮定の発送元
                        address: '東京都千代田区'
                      },
                      destination: {
                        postalCode: postalCode,
                        address: shippingAddress
                      },
                      packageInfo: {
                        weightGrams: weightGrams,
                        dimensions: {
                          length: 30,
                          width: 20,
                          height: 10
                        }
                      },
                      orderId: order.id
                    })
                  })

                  if (deliveryResponse.ok) {
                    const deliveryData = await deliveryResponse.json()
                    console.log('[stripe] delivery created successfully:', deliveryData)

                    // 注文に追跡番号を更新
                    if (deliveryData.trackingNumber) {
                      await withRetries(() => prisma.order.update({
                        where: { id: order.id },
                        data: {
                          trackingNumber: deliveryData.trackingNumber,
                          shippingMethod: deliveryService
                        }
                      }))
                      console.log('[stripe] updated order with tracking number:', deliveryData.trackingNumber)
                    }
                  } else {
                    console.error('[stripe] failed to create delivery:', await deliveryResponse.text())
                  }
                } else {
                  console.warn('[stripe] missing shipping information for delivery creation')
                }
              } catch (deliveryError) {
                console.error('[stripe] error creating delivery:', deliveryError)
                // 配送作成失敗でも決済処理は成功として扱う
              }
            } catch (paymentCreateErr: any) {
              console.error('[stripe][webhook][payment-create] error creating payment', {
                eventId: payload.id,
                sessionId,
                existingOrderId: existingOrderId,
                paymentIntentId,
                resolvedStripeId,
                orderId: order?.id,
                sessionAmount: s.amount_total,
                sessionCurrency: s.currency,
                errCode: paymentCreateErr?.code,
                errMessage: paymentCreateErr?.message,
                errMeta: paymentCreateErr?.meta,
                errStack: paymentCreateErr?.stack,
                timestamp: new Date().toISOString()
              })
              throw paymentCreateErr
            }
          }
        }

        // 3. イベントを処理済みに更新（upsert で確実に存在を担保）
        try {
          const eid = payload && typeof (payload as any).id === 'string' ? (payload as any).id : undefined
          const etype = payload && typeof (payload as any).type === 'string' ? (payload as any).type : undefined
          if (eid && etype) {
            await withRetries(() => prisma.stripeEvent.upsert({
              where: { id: eid },
              create: { id: eid, type: etype, payload: payload as Prisma.InputJsonValue, processed: true, processedAt: new Date() },
              update: { processed: true, processedAt: new Date() }
            }))
          } else {
            console.warn('[stripe] final event upsert skipped: missing id/type on payload')
          }
        } catch (e: unknown) {
          // 最終マークでも P2002 が発生し得る（並列処理や別プロセスの影響）。
          // P2002 は既に存在することを示すので無害化する。
          const ex = e as Record<string, unknown>
          if ((ex as any).code === 'P2002') {
            console.warn('[stripe] final event upsert race/duplicate (P2002) - ignoring:', (payload as any)?.id)
          } else {
            console.warn('[stripe] final event upsert failed:', e)
          }
        }

      console.log('[stripe] successfully processed event:', payload.id)
    } catch (err) {
      console.error('[stripe] handleWebhookEvent error:', err)
      try {
  const fs = await import('fs')
  const path = await import('path')
  const errLogPath = path.join(os.tmpdir(), 'stripe-webhook-errors.jsonl')
  const errMessage = getErrorMessage(err) ?? String(err)
  const errStack = getErrorStack(err)
        const errEntry = JSON.stringify({
          kind: 'handler_exception',
          timestamp: new Date().toISOString(),
          error: {
            message: errMessage,
            stack: errStack
          },
          payloadSample: (payload && typeof payload === 'object') ? { id: payload.id, type: payload.type, dataKeys: Object.keys(payload.data || {}) } : { raw: String(payload).slice(0, 200) }
        }) + '\n'
        fs.appendFileSync(errLogPath, errEntry)
      } catch (logErr) {
        console.warn('[stripe] failed to write handler exception to tmp log:', logErr)
      }
      throw err
    }
  },
}