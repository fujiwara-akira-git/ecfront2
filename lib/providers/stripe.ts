import Stripe from 'stripe'
import { Provider, OrderInput } from './provider'
import { prisma } from '../prisma'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
let stripe: Stripe | null = null
try {
  stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
} catch (initErr) {
  console.error('[stripe] initialization error:', initErr)
  // keep stripe as null; functions below will check and throw meaningful errors
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
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')

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
    // ...既存顧客検索・新規作成処理...

    // 顧客検索・新規作成処理の直後にcustomer/customer_emailをセット
    if (order.metadata?.userEmail) {
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
      // order.metadata.saveCard は 'true'/'false' 文字列または boolean の可能性がある
      const saveCardFlag = parseBooleanish(getMetadataValue(order.metadata, 'saveCard'))
      if (saveCardFlag) {
        sessionOptions.payment_intent_data = {
          setup_future_usage: 'off_session'
        }
      }
    } else {
      // ゲストユーザーの場合は顧客作成のみ
      sessionOptions.customer_creation = 'always'
      sessionOptions.customer_email = order.customerInfo?.email || order.metadata?.userEmail || ''
    }
    if (order.metadata?.userEmail) {
      if (!stripe) {
        throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
      }
      // メールアドレスで既存顧客を検索
      const existingCustomers = await stripe.customers.list({
        email: order.metadata.userEmail,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        // 既存顧客が見つかった場合
        customerId = existingCustomers.data[0].id
        console.log('Stripe: 既存顧客を使用:', customerId)
        // 既存顧客の情報を最新化（住所・電話・氏名があれば更新）
        try {
          const updatePayload: Stripe.CustomerUpdateParams = {}
          if (order.metadata?.userName || order.customerInfo?.name) updatePayload.name = order.metadata?.userName || order.customerInfo?.name
          if (order.customerInfo?.phone) updatePayload.phone = order.customerInfo.phone
          if (order.customerInfo?.address || order.customerInfo?.postalCode || order.customerInfo?.city || order.customerInfo?.state || order.customerInfo?.addressLine2) {
            updatePayload.address = {
              line1: order.customerInfo?.address || undefined,
              line2: order.customerInfo?.addressLine2 || undefined,
              postal_code: order.customerInfo?.postalCode || undefined,
              city: order.customerInfo?.city || undefined,
              state: order.customerInfo?.state || undefined,
              country: 'JP'
            }
          }
          if (Object.keys(updatePayload).length > 0) {
            await stripe.customers.update(customerId, updatePayload)
            console.log('Stripe: updated existing customer with new info', customerId)
          }
        } catch (updateErr) {
          console.warn('[stripe] could not update existing customer info:', updateErr)
        }
      } else {
        // 新規顧客を作成
        const customer = await stripe.customers.create({
          email: order.metadata.userEmail,
          name: order.metadata.userName || order.customerInfo?.name,
          phone: order.customerInfo?.phone,
          address: (order.customerInfo?.address || order.customerInfo?.postalCode || order.customerInfo?.city || order.customerInfo?.state) ? {
            line1: order.customerInfo?.address || undefined,
            line2: order.customerInfo?.addressLine2 || undefined,
            postal_code: order.customerInfo?.postalCode || undefined,
            city: order.customerInfo?.city || undefined,
            state: order.customerInfo?.state || undefined,
            country: 'JP'
          } : undefined,
          metadata: {
            userId: order.metadata.userId || '',
            source: 'eagle-palace-ec'
          }
        })
        customerId = customer.id
        console.log('Stripe: 新規顧客を作成:', customerId)
      }

      // 顧客IDをセッションに設定
      sessionOptions.customer = customerId
      // カード情報の保存を有効化するかはフロントの saveCard フラグに従う
      // order.metadata.saveCard は 'true'/'false' 文字列または boolean の可能性がある
      const saveCardFlag = parseBooleanish(getMetadataValue(order.metadata, 'saveCard'))
      if (saveCardFlag) {
        sessionOptions.payment_intent_data = {
          setup_future_usage: 'off_session'
        }
      }
    } else {
      // ゲストユーザーの場合は顧客作成のみ
      sessionOptions.customer_creation = 'always'
    }

    if (!stripe) {
      throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
    }
    const session = await stripe.checkout.sessions.create(sessionOptions)

    return { checkoutUrl: session.url || undefined, sessionId: session.id }
  },

  async verifyWebhook(headers: Record<string, string>, body: string) {
    const sig = headers['stripe-signature'] || headers['Stripe-Signature'] || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      // No webhook secret configured: accept and parse JSON (dev only)
      return { valid: true, payload: JSON.parse(body || '{}') }
    }
    try {
      if (!stripe) {
        throw new Error('Stripe client not initialized: missing STRIPE_SECRET_KEY or initialization failed')
      }
      const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      return { valid: true, payload: event }
    } catch (err) {
      console.error('stripe webhook verification failed', err)
      return { valid: false }
    }
  },

  async handleWebhookEvent(payload: any) {
    console.log('stripe webhook event received:', payload?.type || '(no type)')

    if (!payload?.id || !payload?.type) {
      console.warn('[stripe] invalid webhook payload: missing id or type')
      return
    }

    try {
      // 冪等性チェック：既に処理済みのイベントは無視
      const existing = await prisma.stripeEvent.findUnique({
        where: { id: payload.id }
      })

      if (existing) {
        console.log('[stripe] event already processed:', payload.id)
        return
      }

      // トランザクションで処理
      await prisma.$transaction(async (tx) => {
        // 1. Stripe イベントを保存
        await tx.stripeEvent.create({
          data: {
            id: payload.id,
            type: payload.type,
            payload: payload,
            processed: false
          }
        })

        // 2. checkout.session.completed の場合は注文とペイメントを作成
        if (payload.type === 'checkout.session.completed') {
          const sessionId = payload?.data?.object?.id
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

            const session = await stripe.checkout.sessions.retrieve(sessionId, {
              expand: ['payment_intent', 'line_items', 'customer']
            }) as ExpandedCheckoutSession

            // 顧客情報を取得（優先順位: session.customer_details -> Stripe Customer オブジェクト -> expanded session.customer）
            let customerDetails: any = session.customer_details
            // Try to fetch full customer from Stripe if session.customer is present
            if ((!customerDetails || !customerDetails.name || !customerDetails.phone) && session.customer) {
              try {
                const custId = extractCustomerIdFromSessionCustomer(session.customer)
                if (custId && stripe) {
                  const fullCustomer = await stripe.customers.retrieve(custId)
                  if (fullCustomer && typeof fullCustomer === 'object') {
                    customerDetails = customerDetails || {}
                    // prefer explicit fields from fullCustomer when available
                    customerDetails.name = customerDetails.name || (fullCustomer as Stripe.Customer).name || undefined
                    customerDetails.email = customerDetails.email || (fullCustomer as Stripe.Customer).email || undefined
                    customerDetails.phone = customerDetails.phone || (fullCustomer as Stripe.Customer).phone || undefined
                    customerDetails.address = customerDetails.address || (fullCustomer as Stripe.Customer).address || undefined
                  }
                }
              } catch (custErr) {
                console.warn('[stripe] could not retrieve full customer from Stripe:', custErr)
              }
            }

            // Stripe Customer IDをUserテーブルに保存（email が判明している場合）
            const custIdForUserRaw = session.customer
            const custIdForUser = extractCustomerIdFromSessionCustomer(custIdForUserRaw)
            const custEmailForUser = customerDetails?.email || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).email : undefined)
            if (custIdForUser && custEmailForUser) {
              try {
                const existingUser = await tx.user.findUnique({ where: { email: custEmailForUser } })
                if (existingUser) {
                  const updateData: any = { stripeCustomerId: custIdForUser }
                  await tx.user.update({
                    where: { email: custEmailForUser },
                    data: updateData
                  })
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
            const addrSource = customerDetails?.address
            if (addrSource) {
              const addr = addrSource
              shippingAddress = [
                addr.postal_code,
                addr.state,
                addr.city,
                addr.line1,
                addr.line2
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
            let paymentIntentId: string | undefined = undefined
            if (paymentIntentRaw) {
              if (typeof paymentIntentRaw === 'string') paymentIntentId = paymentIntentRaw
              else if (typeof paymentIntentRaw === 'object' && paymentIntentRaw !== null && 'id' in paymentIntentRaw) paymentIntentId = (paymentIntentRaw as any).id
              else paymentIntentId = String(paymentIntentRaw)
            }
            console.log('[stripe] payment_intent raw type:', typeof paymentIntentRaw, 'value:', paymentIntentRaw, 'resolved id:', paymentIntentId)

            // 既存注文IDがセッションのmetadataにあれば、その注文を paid に更新して使う
            let order: { id: string } | null = null
            const existingOrderId = session.metadata?.orderId || payload?.data?.object?.metadata?.orderId
            if (existingOrderId) {
              try {
                const found = await tx.order.findUnique({ where: { id: existingOrderId } })
                if (found) {
                  order = await tx.order.update({
                    where: { id: existingOrderId },
                    data: {
                      status: 'paid',
                      totalAmount: session.amount_total || found.totalAmount,
                      subtotal: (session.amount_total || found.totalAmount) - shippingCost,
                      shippingFee: shippingCost,
                      customerEmail: customerDetails?.email || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).email : found.customerEmail),
                      customerName: customerDetails?.name || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).name : found.customerName),
                      customerPhone: customerDetails?.phone || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).phone : found.customerPhone),
                      shippingAddress: shippingAddress,
                      notes: `Stripe Session ID: ${sessionId}`
                    }
                  })
                  console.log('[stripe] updated existing order to paid:', existingOrderId)
                }
              } catch (err) {
                console.warn('[stripe] could not update existing order:', err)
              }
            }

            // 見つからなければ新規作成
            if (!order) {
              order = await tx.order.create({
                data: {
                  totalAmount: session.amount_total || 0,
                  currency: session.currency || 'jpy',
                  status: 'paid',
                  customerEmail: customerDetails?.email || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).email : ''),
                  customerName: customerDetails?.name || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).name : ''),
                  customerPhone: customerDetails?.phone || (session.customer && typeof session.customer === 'object' ? (session.customer as Stripe.Customer).phone : ''),
                  shippingAddress: shippingAddress,
                  subtotal: (session.amount_total || 0) - shippingCost,
                  shippingFee: shippingCost,
                  notes: `Stripe Session ID: ${sessionId}`
                }
              })
            }

            // ペイメントを作成（paymentIntentId を正しく保存）
            // payment_intent が無い、または paymentIntentId が空の場合は
            // session.payment_intent.latest_charge / charges 配列などから代替のIDを取得する
            let resolvedStripeId: string | undefined = paymentIntentId
            try {
              if (!resolvedStripeId) {
                const piRaw: unknown = session.payment_intent
                if (piRaw && typeof piRaw === 'object') {
                  // latest_charge / charges shape may vary; access safely
                  const latestCharge = (piRaw as any).latest_charge || ((piRaw as any).charges && (piRaw as any).charges.data && (piRaw as any).charges.data[0])
                  if (latestCharge) {
                    if (typeof latestCharge === 'string') resolvedStripeId = latestCharge
                    else if (latestCharge && typeof latestCharge === 'object' && 'id' in latestCharge) resolvedStripeId = (latestCharge as any).id
                  }
                  if (!resolvedStripeId && 'id' in (piRaw as any)) resolvedStripeId = (piRaw as any).id
                }
              }
            } catch (resolveErr) {
              console.warn('[stripe] could not resolve stripe id from session/payment_intent:', resolveErr)
            }

            await tx.payment.create({
              data: {
                orderId: order.id,
                stripeId: resolvedStripeId || undefined,
                amount: session.amount_total || 0,
                currency: session.currency || 'jpy',
                status: 'succeeded'
              }
            })

            console.log('[stripe] created order and payment for session:', sessionId, {
              customerEmail: customerDetails?.email,
              customerName: customerDetails?.name,
              customerPhone: customerDetails?.phone,
              shippingAddress: shippingAddress
            })
          }
        }

        // 3. イベントを処理済みに更新
        await tx.stripeEvent.update({
          where: { id: payload.id },
          data: { 
            processed: true,
            processedAt: new Date()
          }
        })
      })

      console.log('[stripe] successfully processed event:', payload.id)
    } catch (err) {
      console.error('[stripe] handleWebhookEvent error:', err)
      throw err
    }
  },
}