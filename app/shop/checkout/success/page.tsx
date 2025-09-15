import Stripe from 'stripe'
import SuccessClient from './SuccessClient'

export default async function Page({ searchParams }: any) {
  const resolvedSearchParams = await searchParams
  const sessionId = resolvedSearchParams?.session_id
  if (!sessionId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Checkout Success</h1>
        <p>Missing session_id in query parameters.</p>
      </div>
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-08-27.basil' })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    })

    const paymentIntent = (session.payment_intent as Stripe.PaymentIntent) || null
    const lineItems = (session as any).line_items as Stripe.ApiList<Stripe.LineItem> | undefined

    return (
      <div style={{ padding: 24 }}>
        <SuccessClient sessionId={sessionId} />
        <h1>決済が完了しました</h1>
        <p>Checkout Session ID: <strong>{session.id}</strong></p>
        <p>Payment Status: <strong>{session.payment_status || 'unknown'}</strong></p>
        {paymentIntent && (
          <>
            <p>支払い ID: <strong>{paymentIntent.id}</strong></p>
            <p>金額: <strong>{
              paymentIntent.currency === 'jpy' ? 
                paymentIntent.amount || 0 : 
                (paymentIntent.amount || 0) / 100
            } {paymentIntent.currency?.toUpperCase()}</strong></p>
          </>
        )}
        {lineItems && (
          <>
            <h2>購入商品</h2>
            <ul>
              {lineItems.data.map((li) => (
                <li key={li.id}>
                  {li.description || (typeof li.price?.product === 'string' ? li.price.product : 'item')} — {li.quantity} × {
                    li.currency === 'jpy' ? 
                      li.price?.unit_amount ?? 0 : 
                      (li.price?.unit_amount ?? 0) / 100
                  } {li.currency?.toUpperCase()}
                </li>
              ))}
            </ul>
          </>
        )}
        <p>この画面を閉じても問題ありません。注文ステータスはサーバで確定されているはずです。</p>
        <div style={{ marginTop: 24 }}>
          <a href="/shop" style={{ 
            display: 'inline-block', 
            padding: '12px 24px', 
            backgroundColor: '#22c55e', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '8px' 
          }}>
            ショップに戻る
          </a>
        </div>
      </div>
    )
  } catch (err: any) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Checkout Success</h1>
        <p>セッション情報の取得に失敗しました。</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'red' }}>{err?.message || String(err)}</pre>
      </div>
    )
  }
}