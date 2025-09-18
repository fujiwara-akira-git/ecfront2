"use client"

import React, { useState } from 'react'
import { useCart } from '@/app/contexts/CartContext'

type ProductShort = {
  id: string
  name: string
  price: number
  producer?: { name?: string }
}

export default function AddToCartButton({ product, disabled }: { product: ProductShort; disabled?: boolean }) {
  const { addItem } = useCart()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    console.log('🖱️ AddToCartButton clicked', { productId: product.id, disabled, loading })
    if (disabled || loading) {
      console.log('🖱️ Click ignored due to disabled/loading', { disabled, loading })
      return
    }
    setLoading(true)
    try {
      await addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        producerName: product.producer?.name || ''
      })
    } catch (err) {
      console.error('AddToCart error', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`px-3 py-2 rounded text-white ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} ${loading ? 'opacity-80' : ''}`}
      aria-disabled={disabled || loading}
    >
      {loading ? '追加中...' : disabled ? '在庫なし' : 'カートに入れる'}
    </button>
  )
}
