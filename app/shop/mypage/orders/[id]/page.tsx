import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { convertToJPY, formatCurrency } from '@/lib/currency'
import { extractPostalCode } from '@/lib/address'

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = await params
  return { title: `注文 ${id}` }
}

export default async function OrderDetail({ params }: any) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: { include: { product: true } },
      payments: true,
      user: true,
    },
  })

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
          <div>住所: {order.shippingAddress || '—'}</div>
          <div>電話番号: {order.customerPhone || '—'}</div>
                  <div>郵便番号: {(() => {
                    // Try shippingAddress parsing, then order.postalCode, then user.postalCode
                    const fromShipping = extractPostalCode(order.shippingAddress)
                    if (fromShipping) return fromShipping
                    // If order has explicit postalCode field
                    if ((order as any).postalCode) return (order as any).postalCode
                    // fallback to related user
                    if (order.user && (order.user as any).postalCode) return (order.user as any).postalCode
                    return '—'
                  })()}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-3">商品</h2>
          <ul className="divide-y">
            {order.orderItems && order.orderItems.length > 0 ? (
              order.orderItems.map((it: any) => (
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
