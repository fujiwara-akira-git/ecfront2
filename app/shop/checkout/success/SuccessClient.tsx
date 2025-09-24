'use client'

import { useEffect } from 'react'
import { useCart } from '@/app/contexts/CartContext'
import { useSession } from 'next-auth/react'

interface SuccessClientProps {
  sessionId: string
}

export default function SuccessClient({ sessionId }: SuccessClientProps) {
  const { clearCart } = useCart()
  const { status } = useSession()

  useEffect(() => {
    // 決済成功時にカートを一度だけクリア（localStorage ガード）
    try {
      if (!sessionId) return
      const key = `checkout_cleared_${sessionId}`
      const already = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      if (already) return
      // Wait until session status is resolved so clearCart can call server API when
      // the user is authenticated. If session status is still loading, defer.
      if (status === 'loading') return
      // 実行してフラグを立てる
      clearCart()
        .then(() => {
          try { window.localStorage.setItem(key, '1') } catch (e) { /* ignore */ }
        })
        .catch((err: any) => console.error(err))
    } catch (err) {
      console.error('SuccessClient clearCart error', err)
    }
  }, [sessionId, clearCart, status])

  return null // このコンポーネントはUIを表示しない
}