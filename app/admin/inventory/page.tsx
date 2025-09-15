'use client'

import { useState } from 'react'

type Product = { id: string; name: string; price: number; ecStock: number; storeStock: number; producerName: string }

export default function InventoryPage() {
  const [items, setItems] = useState<Product[]>([
    { id: '1', name: 'りんご', price: 200, ecStock: 45, storeStock: 50, producerName: '山田農園' },
    { id: '2', name: 'みかん', price: 150, ecStock: 25, storeStock: 30, producerName: '鈴木果樹園' },
  ])

  const update = (id: string, field: 'ecStock' | 'storeStock', value: number) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
            <a href="/admin" className="text-blue-600 hover:text-blue-800">← 戻る</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">商品</th>
                <th className="px-4 py-2 text-left">EC在庫</th>
                <th className="px-4 py-2 text-left">店舗在庫</th>
                <th className="px-4 py-2 text-left">生産者</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(it => (
                <tr key={it.id}>
                  <td className="px-4 py-3">{it.name} <div className="text-xs text-gray-500">¥{it.price}</div></td>
                  <td className="px-4 py-3"><input className="w-20 p-1 border" type="number" value={it.ecStock} onChange={(e) => update(it.id, 'ecStock', Number(e.target.value))} /></td>
                  <td className="px-4 py-3"><input className="w-20 p-1 border" type="number" value={it.storeStock} onChange={(e) => update(it.id, 'storeStock', Number(e.target.value))} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{it.producerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
