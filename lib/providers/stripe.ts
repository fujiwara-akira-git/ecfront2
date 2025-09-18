import Stripe from 'stripe'
import { Provider, OrderInput } from './provider'
import { prisma } from '../prisma'
import { runWithRetry } from '@/lib/dbWithRetry'
import config from '../config'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
let stripe: Stripe | null = null
try {
  stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
} catch (initErr) {
  console.error('[stripe] initialization error:', initErr)
  // keep stripe as null; functions below will check and throw meaningful errors
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

// Helpers for safe metadata and value parsing
function toStringMetadata(metadata?: Record<string, any>): Record<string, string> | undefined {
  if (!metadata) return undefined
  const out: Record<string, string> = {}
  for (const key of Object.keys(metadata)) {
    const v = metadata[key]
    if (v === undefined || v === null) continue
    out[key] = typeof v === 'string' ? v : String(v)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function getMetadataValue(metadata: Record<string, any> | undefined, key: string): string | undefined {
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

export const stripeProvider: Provider = {
  async createCheckoutSession(order: OrderInput) {
    const line_items = (order.items || []).map((it) => ({
      price_data: {
        currency: order.currency || 'jpy',
        product_data: { name: it.name || it.sku },
        // JPYの場合、最小単位は1円（他の通貨と異なり100で割らない）
        unit_amount: Math.round(it.unitPrice),
      },
      quantity: it.quantity,
    }))

    // 送料がある場合、line_itemsに追加
    if (order.shippingFee && order.shippingFee > 0) {
      line_items.push({
        price_data: {
          currency: order.currency || 'jpy',
          product_data: { name: '送料' },
          unit_amount: Math.round(order.shippingFee),
        },
        quantity: 1,
      })
    }

    // セッション作成のオプションを準備
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || config.NEXTAUTH_URL || config.getBaseUrl()).replace(/\/$/, '')
    console.log('[stripe] using appUrl for success/cancel urls:', appUrl)

    // customer/customer_emailは初期化時に含めない
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
  metadata: toStringMetadata(order.metadata),
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
      customer: (sessionOptions as any).customer,
      customer_creation: (sessionOptions as any).customer_creation,
      customer_email: (sessionOptions as any).customer_email,
      metadata: sessionOptions.metadata
    })
    const session = await stripe.checkout.sessions.create(sessionOptions)

    return { checkoutUrl: session.url || undefined, sessionId: session.id }
  },

  async verifyWebhook(headers: Record<string, string>, body: string) {
    const sig = headers['stripe-signature'] || headers['Stripe-Signature'] || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
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
      console.error('stripe webhook verification failed', err)
      return { valid: false }
    }
  },

  async handleWebhookEvent(payload: any) {
    console.log('stripe webhook event received:', payload?.type || '(no type)', {
      eventId: payload?.id,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    })
    stripeDebug('raw payload keys:', payload && typeof payload === 'object' ? Object.keys(payload).slice(0,10) : String(payload))

    if (!payload?.id || !payload?.type) {
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
          where: { id: payload.id },
          create: { id: payload.id, type: payload.type, payload: payload, processed: false },
          update: { payload: payload }
        })
      } catch (upsertErr: any) {
        // upsert が P2002 (unique constraint) を投げることは通常ないが、
        // 競合や並列処理のタイミングによって発生し得るため、
        // 明示的に無害化して続行する。
        const isP2002 = upsertErr && upsertErr.code === 'P2002'
        if (isP2002) {
          console.warn('[stripe] stripeEvent upsert race/duplicate (P2002) - ignoring:', payload.id)
        } else {
          console.warn('[stripe] stripeEvent upsert warning:', upsertErr)
        }
      }

      // 再チェック：もし既に processed=true なら二重処理を避ける
      const existing = await prisma.stripeEvent.findUnique({ where: { id: payload.id } })
      if (existing && existing.processed) {
        console.log('[stripe] event already processed (skip):', payload.id)
        return
      }

      // 2) checkout.session.completed の場合は注文とペイメントを作成
      if (payload.type === 'checkout.session.completed') {
          const sessionId = payload?.data?.object?.id
          stripeDebug('checkout.session.completed payload.data.object keys:', payload?.data?.object && typeof payload.data.object === 'object' ? Object.keys(payload.data.object).slice(0,20) : String(payload?.data?.object))
            if (sessionId) {
            // Stripe から詳細セッション情報を取得
            if (!stripe) {
              throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
            }
            // We request expanded fields; define a local union type to help TypeScript understand shipping_details/payment_intent
            type ExpandedCheckoutSession = Stripe.Checkout.Session & {
              payment_intent?: Stripe.PaymentIntent | string | null
              line_items?: Stripe.ApiList<Stripe.LineItem>
              customer?: Stripe.Customer | string | null
              shipping_details?: {
                name?: string | null
                phone?: string | null
                address?: {
                  line1?: string | null
                  line2?: string | null
                  postal_code?: string | null
                  city?: string | null
                  state?: string | null
                  country?: string | null
                } | null
              } | null
            }

            let session: ExpandedCheckoutSession | null = null
            try {
              session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['payment_intent', 'line_items', 'customer']
              }) as ExpandedCheckoutSession
              console.log('[stripe] successfully retrieved session:', sessionId, {
                amount_total: session.amount_total,
                currency: session.currency,
                payment_status: session.payment_status,
                status: session.status
              })
            } catch (retrieveErr: any) {
              const isResourceMissing = retrieveErr && (retrieveErr.code === 'resource_missing' || retrieveErr?.raw?.code === 'resource_missing' || retrieveErr?.statusCode === 404)
              if (isResourceMissing) {
                console.warn('[stripe] checkout.session not found on Stripe for id (fixture or deleted):', sessionId)
                console.warn('[stripe] retrieve error details:', {
                  code: retrieveErr?.code,
                  message: retrieveErr?.message,
                  statusCode: retrieveErr?.statusCode,
                  type: retrieveErr?.type
                })
                try {
                  await prisma.stripeEvent.upsert({
                    where: { id: payload.id },
                    create: { id: payload.id, type: payload.type, payload: payload, processed: true, processedAt: new Date() },
                    update: { processed: true, processedAt: new Date() }
                  })
                } catch (e) {
                  console.warn('[stripe] marking event processed failed:', e)
                }
                return
              }
              console.error('[stripe] failed to retrieve checkout session:', sessionId, {
                error: retrieveErr?.message,
                code: retrieveErr?.code,
                statusCode: retrieveErr?.statusCode
              })
              throw retrieveErr
            }
            stripeDebug('expanded session retrieved: id=', session.id, 'customer_details=', session.customer_details ? Object.keys(session.customer_details).slice(0,10) : undefined)
            stripeDebug('session.shipping_details keys=', session.shipping_details ? Object.keys(session.shipping_details as any) : undefined)
            stripeDebug('session.payment_intent (type) =', typeof session.payment_intent)
            // log top-level line items summary
            try {
              const items = session.line_items && typeof session.line_items === 'object' && Array.isArray((session.line_items as any).data) ? (session.line_items as any).data.map((it: any) => ({ description: it.description, quantity: it.quantity, price: it.price && it.price.unit_amount })) : undefined
              stripeDebug('line_items summary:', items)
            } catch (liErr) {
              stripeDebug('line_items parse error', liErr)
            }

            // 顧客情報を取得（優先順位: session.customer_details -> Stripe Customer オブジェクト -> expanded session.customer）
            let customerDetails: Record<string, unknown> | undefined = undefined
            if (session.customer_details && typeof session.customer_details === 'object') {
              customerDetails = session.customer_details as unknown as Record<string, unknown>
            }
            // Try to fetch full customer from Stripe if session.customer is present
            if ((!customerDetails || !customerDetails.name || !customerDetails.phone) && session.customer) {
              try {
                const custId = extractCustomerIdFromSessionCustomer(session.customer)
                if (custId && stripe) {
                  const fullCustomer = await stripe.customers.retrieve(custId)
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
            const custIdForUserRaw = session.customer
            const custIdForUser = extractCustomerIdFromSessionCustomer(custIdForUserRaw)
            const custEmailForUser = (typeof customerDetails?.email === 'string' ? customerDetails!.email as string : extractCustomerEmail(session.customer))
            stripeDebug('resolved customer for user:', { custIdForUser, custEmailForUser })
            if (custIdForUser && custEmailForUser) {
              try {
                const existingUser = await prisma.user.findUnique({ where: { email: custEmailForUser } })
                if (existingUser) {
                  const updateData: any = { stripeCustomerId: custIdForUser }
                  await withRetries(() => prisma.user.update({
                    where: { email: custEmailForUser },
                    data: updateData
                  }))
                  console.log('[stripe] saved customer ID for user:', custEmailForUser, custIdForUser)
                } else {
                  console.log('[stripe] user not found, skipping user update for email:', custEmailForUser)
                }
              } catch (userUpdateError) {
                console.warn('[stripe] could not update user with customer ID:', userUpdateError)
                // エラーでも決済処理は続行する
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

            // Stripe顧客情報をCheckout画面の配送先で上書き
            // shipping_details may be present on the expanded session
            const sessionShippingDetails = (session as ExpandedCheckoutSession).shipping_details
            if (session.customer && sessionShippingDetails && sessionShippingDetails.address) {
              try {
                const custId = extractCustomerIdFromSessionCustomer(session.customer)
                if (custId) {
                  const shippingAddr = sessionShippingDetails.address
                  const updatePayload: Stripe.CustomerUpdateParams = {
                    address: {
                      line1: shippingAddr.line1 || undefined,
                      line2: shippingAddr.line2 || undefined,
                      postal_code: shippingAddr.postal_code || undefined,
                      city: shippingAddr.city || undefined,
                      state: shippingAddr.state || undefined,
                      country: shippingAddr.country || 'JP'
                    }
                  }
                  if (sessionShippingDetails.name) updatePayload.name = sessionShippingDetails.name
                  if (sessionShippingDetails.phone) updatePayload.phone = sessionShippingDetails.phone
                  await stripe.customers.update(custId, updatePayload)
                  console.log('[stripe] 顧客情報をCheckout配送先で上書き:', custId, updatePayload)
                }
              } catch (err) {
                console.warn('[stripe] 顧客情報の配送先上書き失敗:', err)
              }
            }

            // 注文を作成または既存注文の更新（metadata.orderId があれば更新）
            const shippingCost = session.shipping_cost?.amount_total || 0

            // payment_intent は expand しているためオブジェクト／文字列どちらの可能性もある
            const paymentIntentRaw: unknown = session.payment_intent
            const paymentIntentId = getIdFromUnknown(paymentIntentRaw)
            stripeDebug('[stripe] payment_intent raw type:', typeof paymentIntentRaw, 'resolved id:', paymentIntentId)

            // 既存注文IDがセッションのmetadataにあれば、その注文を paid に更新して使う
            let order: { id: string } | null = null
            const existingOrderId = session.metadata?.orderId || payload?.data?.object?.metadata?.orderId
            if (existingOrderId) {
              try {
                const found = await prisma.order.findUnique({ where: { id: existingOrderId } })
                if (found) {
                  const finalCustomerEmail = getStringFromRecord(customerDetails, 'email') || extractCustomerEmail(session.customer) || found.customerEmail
                  const cdName = getStringFromRecord(customerDetails, 'name')
                  const sessionName = (session.customer && typeof session.customer === 'object' && typeof (session.customer as Stripe.Customer).name === 'string') ? (session.customer as Stripe.Customer).name : undefined
                  const dbName = found.customerName ?? ''
                  const finalCustomerName: string = cdName ?? sessionName ?? dbName
                  const cdPhone = getStringFromRecord(customerDetails, 'phone')
                  const sessionPhone = (session.customer && typeof session.customer === 'object' && typeof (session.customer as Stripe.Customer).phone === 'string') ? (session.customer as Stripe.Customer).phone : undefined
                  const dbPhone = found.customerPhone ?? ''
                  const finalCustomerPhone: string = cdPhone ?? sessionPhone ?? dbPhone
                  order = await withRetries(() => prisma.order.update({
                    where: { id: existingOrderId },
                    data: {
                      status: 'paid',
                      totalAmount: session.amount_total || found.totalAmount,
                      subtotal: (session.amount_total || found.totalAmount) - shippingCost,
                      shippingFee: shippingCost,
                      customerEmail: finalCustomerEmail,
                      customerName: finalCustomerName,
                      customerPhone: finalCustomerPhone,
                      shippingAddress: shippingAddress,
                      notes: `Stripe Session ID: ${sessionId}`
                    }
                  }))
                  console.log('[stripe] updated existing order to paid:', existingOrderId)
                }
              } catch (err) {
                console.warn('[stripe] could not update existing order:', err)
              }
            }

            // 見つからなければ新規作成
            if (!order) {
              let finalCustomerEmail: string = ''
              let finalCustomerName: string = ''
              let finalCustomerPhone: string = ''

              try {
                finalCustomerEmail = getStringFromRecord(customerDetails, 'email') || extractCustomerEmail(session.customer) || ''
                const cdName = getStringFromRecord(customerDetails, 'name')
                const sessionName = (session.customer && typeof session.customer === 'object' && typeof (session.customer as Stripe.Customer).name === 'string') ? (session.customer as Stripe.Customer).name : undefined
                finalCustomerName = cdName ?? sessionName ?? ''
                const cdPhone = getStringFromRecord(customerDetails, 'phone')
                const sessionPhone = (session.customer && typeof session.customer === 'object' && typeof (session.customer as Stripe.Customer).phone === 'string') ? (session.customer as Stripe.Customer).phone : undefined
                finalCustomerPhone = cdPhone ?? sessionPhone ?? ''

                order = await withRetries(() => prisma.order.create({
                  data: {
                    totalAmount: session.amount_total || 0,
                    currency: session.currency || 'jpy',
                    status: 'paid',
                    customerEmail: finalCustomerEmail,
                    customerName: finalCustomerName,
                    customerPhone: finalCustomerPhone,
                    shippingAddress: shippingAddress,
                    subtotal: (session.amount_total || 0) - shippingCost,
                    shippingFee: shippingCost,
                    notes: `Stripe Session ID: ${sessionId}`
                  }
                }))
              } catch (orderCreateErr: any) {
                console.error('[stripe][webhook][order-create] error creating order', {
                  eventId: payload.id,
                  sessionId,
                  existingOrderId: existingOrderId,
                  paymentIntentId,
                  sessionAmount: session.amount_total,
                  sessionCurrency: session.currency,
                  customerEmail: finalCustomerEmail || 'undefined',
                  customerName: finalCustomerName || 'undefined',
                  customerPhone: finalCustomerPhone || 'undefined',
                  shippingAddress: shippingAddress,
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
                const piRaw: unknown = session.payment_intent
                const chargeId = getChargeIdFromPaymentIntent(piRaw)
                stripeDebug('resolved chargeId from payment_intent candidate:', chargeId)
                if (chargeId) resolvedStripeId = chargeId
              }
            } catch (resolveErr) {
              console.warn('[stripe] could not resolve stripe id from session/payment_intent:', resolveErr)
            }

            try {
              const payment = await withRetries(() => prisma.payment.create({
                data: {
                  orderId: order.id,
                  stripeId: resolvedStripeId || undefined,
                  amount: session.amount_total || 0,
                  currency: session.currency || 'jpy',
                  status: 'succeeded'
                }
              }))
              console.log('[stripe] created order and payment for session:', sessionId, {
                customerEmail: customerDetails?.email,
                customerName: customerDetails?.name,
                customerPhone: customerDetails?.phone,
                shippingAddress: shippingAddress,
                orderId: order.id,
                paymentId: payment.id,
                stripeId: payment.stripeId,
                timestamp: new Date().toISOString()
              })

              // 決済完了後に配送を作成
              try {
                const deliveryService = session.metadata?.deliveryService || 'japanpost'
                const weightGrams = parseInt(session.metadata?.weightGrams || '500')
                const postalCode = session.metadata?.postalCode || ''

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
                sessionAmount: session.amount_total,
                sessionCurrency: session.currency,
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
          await withRetries(() => prisma.stripeEvent.upsert({
            where: { id: payload.id },
            create: { id: payload.id, type: payload.type, payload: payload, processed: true, processedAt: new Date() },
            update: { processed: true, processedAt: new Date() }
          }))
        } catch (e: any) {
          // 最終マークでも P2002 が発生し得る（並列処理や別プロセスの影響）。
          // P2002 は既に存在することを示すので無害化する。
          if (e && e.code === 'P2002') {
            console.warn('[stripe] final event upsert race/duplicate (P2002) - ignoring:', payload.id)
          } else {
            console.warn('[stripe] final event upsert failed:', e)
          }
        }

      console.log('[stripe] successfully processed event:', payload.id)
    } catch (err) {
      console.error('[stripe] handleWebhookEvent error:', err)
      throw err
    }
  },
}