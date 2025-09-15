import React from 'react'

export default function MockCheckoutPage({ searchParams }: any) {
  const orderId = searchParams?.orderId || 'temp'
  const total = Number(searchParams?.total || '0')
  const shipping = Number(searchParams?.shipping || '0')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4">Mock Checkout</h1>
        <p className="text-sm text-gray-600 mb-4">Order ID: {orderId}</p>
        <div className="mb-4">
          <div className="flex justify-between"><span>Subtotal</span><span>¥{(total - shipping).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>¥{shipping.toLocaleString()}</span></div>
          <hr className="my-3" />
          <div className="flex justify-between font-semibold"><span>Total</span><span>¥{total.toLocaleString()}</span></div>
        </div>
        <div className="flex gap-3">
          <a href="/shop" className="px-4 py-2 border rounded">戻る</a>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded">支払いをシミュレート</button>
        </div>
      </div>
    </div>
  )
}
