import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { convertToJPY, formatCurrency } from '@/lib/currency'
import { extractPostalCode, formatJapaneseAddress, splitJapaneseAddress } from '@/lib/address'
import type { Prisma } from '@prisma/client'

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    orderItems: { include: { product: true } }
    payments: true
    user: true
  }
}>

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = params
  return { title: `注文 ${id}` }
}

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: { include: { product: true } },
      payments: true,
      user: true,
    },
  }) as OrderWithRelations | null

  if (!order) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold">注文が見つかりません</h1>
          <div className="mt-4">
            <Link href="/shop/mypage" className="text-emerald-600">マイページへ戻る</Link>
          </div>
        </div>
      </div>
    )
  }

  const payment = order.payments && order.payments[0]
  const paidAmount = payment ? payment.amount : order.totalAmount
  const currency = payment ? payment.currency : order.currency || 'JPY'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">注文詳細</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-sm text-gray-600">注文日: {new Date(order.createdAt).toLocaleString()}</div>
          <div className="mt-2">名前: {order.customerName || order.customerEmail}</div>
          <div>
            <div className="font-medium">住所</div>
            {(() => {
              const raw = (order.shippingAddress || '').trim()
              const userAddr = order.user && order.user.address ? String(order.user.address).trim() : ''
              // Prefer explicit DB-split fields when present; but if parts are
              // partially missing, attempt to fill from the raw shippingAddress
              // or the related user's address so the UI shows a complete address.
              let dbPref = order.shippingPrefecture || ''
              let dbCity = order.shippingCity || ''
              let dbRest = order.shippingRest || ''

              // If any piece is missing, try to parse fallback candidate(s)
              if (!dbPref || !dbCity || !dbRest) {
                const fallbackCandidate = raw || userAddr
                const fallbackParts = splitJapaneseAddress(fallbackCandidate)
                if (fallbackParts) {
                  if (!dbPref && fallbackParts.prefecture) dbPref = fallbackParts.prefecture
                  if (!dbCity && fallbackParts.city) dbCity = fallbackParts.city
                  if (!dbRest && fallbackParts.rest) dbRest = fallbackParts.rest
                }
              }

              // NOTE: Do not attempt to infer prefecture/city from postal code here.
              // User-entered or DB-stored address fields must be respected. If
              // prefecture/city are missing, rely on parsing the shippingAddress
              // or the related user address (above). Postal-code-based best-effort
              // lookup was removed to avoid overwriting user input.

              // If we now have at least one piece, render the split lines (use em dash for missing)
              if (dbPref || dbCity || dbRest) {
                return (
                  <div className="text-sm text-gray-700">
                    <div>都道府県: {dbPref || '—'}</div>
                    <div>市区郡: {dbCity || '—'}</div>
                    <div>住所: {dbRest || '—'}</div>
                  </div>
                )
              }

              // Last resort: formatted single-line address or em dash
              const formatted = formatJapaneseAddress(raw, userAddr)
              return <div className="text-sm text-gray-700">{formatted || '—'}</div>
            })()}
          </div>
          <div>電話番号: {order.customerPhone || '—'}</div>
                  <div>郵便番号: {(() => {
                    // Try shippingAddress parsing, then order.postalCode, then user.postalCode
                    const fromShipping = extractPostalCode(order.shippingAddress)
                    if (fromShipping) return fromShipping
                    // If order has explicit postalCode field
                    if (order.postalCode) return order.postalCode
                    // fallback to related user
                    if (order.user && order.user.postalCode) return order.user.postalCode
                    return '—'
                  })()}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-3">商品</h2>
          <ul className="divide-y">
            {order.orderItems && order.orderItems.length > 0 ? (
              order.orderItems.map((it) => (
                <li key={it.id} className="py-3 flex justify-between">
                  <div>
                    <div className="font-medium">{it.product?.name || 'Unknown Product'}</div>
                    <div className="text-sm text-gray-500">数量: {it.quantity}</div>
                    <div className="text-sm text-gray-500">単価: {formatCurrency(it.unitPrice || 0, currency)}</div>
                  </div>
                  <div className="text-right">小計: ¥{(it.totalPrice || it.unitPrice || 0).toLocaleString()}</div>
                </li>
              ))
            ) : (
              <li className="py-3">商品情報がありません</li>
            )}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between">
            <div>配送料</div>
            <div>¥{(order.shippingFee || 0).toLocaleString()}</div>
          </div>
          <div className="flex justify-between mt-2 font-medium">
            <div>合計</div>
            <div>¥{(currency.toLowerCase() === 'usd' ? convertToJPY(paidAmount || 0, currency) : paidAmount).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/shop/mypage" className="text-emerald-600">マイページへ戻る</Link>
        </div>
      </div>
    </div>
  )
}
