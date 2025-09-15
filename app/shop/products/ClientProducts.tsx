"use client"

import { useMemo, useState } from 'react'
import SearchBar from '../../components/SearchBar'
import Link from 'next/link'
import { useCart } from '../../contexts/CartContext'
import { useToast } from '../../contexts/ToastContext'
import type { Product } from './_data'

// 在庫状況の表示コンポーネント
const StockStatus = ({ product }: { product: Product }) => {
  const { stock = 0, isInStock = false } = product
  
  if (!isInStock || stock <= 0) {
    return <span className="text-red-500 font-semibold text-xs">在庫切れ</span>
  }
  
  if (stock <= 5) {
    return <span className="text-orange-500 font-semibold text-xs">残り{stock}点</span>
  }
  
  return <span className="text-green-600 font-semibold text-xs">在庫あり</span>
}

export default function ClientProducts({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const { addItem } = useCart()
  const { showToast } = useToast()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => (p.name + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase().includes(q))
  }, [products, query])

  const handleQuickAdd = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault() // Link の動作を防ぐ
    
    // 在庫チェック
    if (!product.isInStock || (product.stock || 0) <= 0) {
      showToast('申し訳ございません。この商品は現在品切れです。', 'error')
      return
    }
    
    try {
      await addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        producerName: product.producerName,
        description: product.description
      })

      showToast(
        `🛒 ${product.name} をカートに追加しました！`,
        'success',
        3000
      )
    } catch (err) {
      console.error('クイック追加エラー:', err)
      showToast('カートへの追加に失敗しました。', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SearchBar onSearch={(q) => setQuery(q)} />
        <div className="text-sm text-gray-500">{filtered.length} 商品</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
            <Link href={`/shop/products/${p.id}`} className="block">
              <div className="h-40 w-full bg-gray-100 rounded-md overflow-hidden mb-4 flex items-center justify-center text-6xl">
                {p.image || '🥬'}
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-sm text-gray-600">¥{p.price.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">生産者: {p.producerName}</div>
                <StockStatus product={p} />
              </div>
              {p.category && (
                <div className="mb-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {p.category}
                  </span>
                </div>
              )}
              <div className="text-sm text-gray-500">{p.description || '新鮮な地元産'}</div>
            </Link>
            <div className="mt-4 pt-3 border-t">
              <button
                onClick={(e) => handleQuickAdd(e, p)}
                disabled={!p.isInStock || (p.stock || 0) <= 0}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  p.isInStock && (p.stock || 0) > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {p.isInStock && (p.stock || 0) > 0 ? 'カートに追加' : '売り切れ'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
