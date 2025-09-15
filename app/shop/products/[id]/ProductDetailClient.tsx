'use client'

import { useCart } from '../../../contexts/CartContext'
import { useToast } from '../../../contexts/ToastContext'
import { useState } from 'react'
import Link from 'next/link'
import type { Product } from '../_data'

// 在庫状況の表示コンポーネント
const StockStatus = ({ product }: { product: Product }) => {
  const { stock = 0, isInStock = false } = product
  
  if (!isInStock || stock <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <span className="text-red-600 font-semibold">🚫 現在品切れ中</span>
        <p className="text-red-500 text-sm mt-1">入荷をお待ちください</p>
      </div>
    )
  }
  
  if (stock <= 5) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <span className="text-orange-600 font-semibold">⚠️ 残り{stock}点</span>
        <p className="text-orange-500 text-sm mt-1">お早めにご注文ください</p>
      </div>
    )
  }
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <span className="text-green-600 font-semibold">✅ 在庫あり</span>
      <p className="text-green-500 text-sm mt-1">ご注文いただけます</p>
    </div>
  )
}

interface ProductDetailClientProps {
  product: Product
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem } = useCart()
  const { showToast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const isAvailable = product.isInStock && (product.stock || 0) > 0
  const maxQuantity = Math.min(product.stock || 0, 10) // 最大10個まで

  const handleAddToCart = async () => {
    if (!isAvailable) {
      showToast('申し訳ございません。この商品は現在品切れです。', 'error')
      return
    }

    if (quantity > (product.stock || 0)) {
      showToast(`申し訳ございません。在庫は${product.stock}点までです。`, 'warning')
      return
    }

    setIsAdding(true)
    
    try {
      for (let i = 0; i < quantity; i++) {
        await addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          producerName: product.producerName,
          description: product.description
        })
      }
      
      // ユーザーフィードバック
      setTimeout(() => {
        setIsAdding(false)
        setQuantity(1)
        showToast(
          `🛒 ${product.name} を ${quantity} 個カートに追加しました！`,
          'success',
          4000
        )
      }, 300)
    } catch (error) {
      setIsAdding(false)
      showToast('カートへの追加中にエラーが発生しました。', 'error')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* 商品画像 */}
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4">{product.image || '🥬'}</div>
          <div className="text-gray-400">商品画像</div>
        </div>
      </div>

      {/* 商品情報 */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-600">生産者: {product.producerName}</p>
          {product.category && (
            <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
              {product.category}
            </span>
          )}
        </div>

        <div className="text-3xl font-bold text-green-600">
          ¥{product.price.toLocaleString()}
        </div>

        {/* 在庫状況 */}
        <StockStatus product={product} />

        {product.description && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">商品説明</h2>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* 数量選択とカート追加 */}
        <div className="space-y-4">
          {isAvailable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数量 (最大{maxQuantity}個まで)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                  disabled={isAdding || quantity <= 1}
                >
                  -
                </button>
                <span className="w-16 text-center text-lg font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                  disabled={isAdding || quantity >= maxQuantity}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={isAdding || !isAvailable}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
              isAvailable
                ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {!isAvailable 
              ? '品切れ中' 
              : isAdding 
                ? 'カートに追加中...' 
                : `カートに追加 (¥${(product.price * quantity).toLocaleString()})`
            }
          </button>
        </div>

        {/* ナビゲーション */}
        <div className="pt-4 border-t">
            <Link
              href="/shop/products"
              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              ← 商品一覧に戻る
            </Link>
        </div>
      </div>
    </div>
  )
}