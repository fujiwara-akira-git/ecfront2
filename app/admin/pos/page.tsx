'use client'

import { useState } from 'react'

type Product = { id: string; name: string; price: number }

export default function POSPage() {
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([])
  const products: Product[] = [
    { id: '1', name: 'りんご', price: 200 },
    { id: '2', name: 'みかん', price: 150 },
  ]

  const add = (p: Product) => setCart(c => { const ex = c.find(x => x.product.id === p.id); return ex ? c.map(x => x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { product: p, qty: 1 }] })
  const total = () => cart.reduce((s, it) => s + it.product.price * it.qty, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">POS</h1>
            <a href="/admin" className="text-blue-600 hover:text-blue-800">← 戻る</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {products.map(p => (
            <button key={p.id} onClick={() => add(p)} className="p-3 border rounded">{p.name} ¥{p.price}</button>
          ))}
        </div>

        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="font-semibold">カート</h2>
          <div className="mt-2">合計: ¥{new Intl.NumberFormat('ja-JP').format(total())}</div>
        </div>
      </main>
    </div>
  )
}
