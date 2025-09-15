"use client"
import { useEffect, useState } from 'react'
import { useCart, CartProvider } from '../contexts/CartContext'
import { SessionProvider } from './SessionProvider'

type ProductType = {
  id: string
  name: string
  price: number
  producerName: string
  description: string
  category: string
  image: string
  stock: number
  isInStock: boolean
}


function HomeProductsInner() {
  const [products, setProducts] = useState<ProductType[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []))
  }, [])

  return (
    <section className="py-20 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
            🥬 SEASONAL VEGETABLES
          </span>
          <h2 className="text-4xl font-bold text-gray-800 mb-6">今月の旬の野菜</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            季節ごとの美味しい野菜をお届け。今が一番美味しい旬の野菜をご紹介します。
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {products.map(product => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="text-5xl mb-4 text-center">{product.image}</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800 text-center">{product.name}</h3>
              <p className="text-gray-600 text-center mb-4">{product.description}</p>
              <div className="text-center mb-2">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {product.category}
                </span>
              </div>
              <div className="text-center mb-2">
                <span className="text-lg font-bold text-gray-800">¥{product.price}</span>
              </div>
              <button
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full font-semibold shadow hover:scale-105 transition-all"
                onClick={() => addItem(product)}
                disabled={!product.isInStock}
              >
                {product.isInStock ? 'カートに追加' : '在庫なし'}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center">
          <a 
            href="/shop" 
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg transform hover:scale-105 transition-all inline-flex items-center gap-3"
          >
            <span className="text-xl">🛒</span>
            全ての商品を見る
          </a>
        </div>
      </div>
    </section>
  )
}

export default function HomeProducts() {
  return (
    <SessionProvider>
      <CartProvider>
        <HomeProductsInner />
      </CartProvider>
    </SessionProvider>
  )
}
