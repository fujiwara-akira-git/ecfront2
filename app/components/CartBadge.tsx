"use client"

import Link from 'next/link'
import { useCart } from '../contexts/CartContext'

export default function CartBadge() {
  const { getItemCount } = useCart()
  const count = getItemCount()

  return (
    <Link href="/shop/cart" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
      <span className="text-lg">🛒</span>
      <span>カート</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
          {count}
        </span>
      )}
    </Link>
  )
}
