"use client"
import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'

type Props = { producerId: string; initial?: boolean }

export default function FavoriteToggle({ producerId, initial = false }: Props) {
  const [fav, setFav] = useState<boolean>(initial)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => setFav(initial), [initial])

  async function toggle() {
    setLoading(true)
    try {
      if (!fav) {
        const res = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ producerId }) })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'failed to add favorite')
        }
        setFav(true)
        showToast('お気に入りに追加しました', 'success')
      } else {
        const res = await fetch(`/api/favorites/${producerId}`, { method: 'DELETE' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'failed to remove favorite')
        }
        setFav(false)
        showToast('お気に入りを解除しました', 'info')
      }
    } catch (err: any) {
      console.error('favorite toggle error', err)
      showToast(err?.message || 'お気に入りの更新に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label="favorite-button"
      data-testid="favorite-toggle"
      className={`px-3 py-1 text-sm rounded ${fav ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
      {loading ? '処理中...' : fav ? 'お気に入り済み' : 'お気に入り'}
    </button>
  )
}
