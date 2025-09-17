"use client"
import { useState, useEffect } from 'react'

type Props = { producerId: string; initial?: boolean }

export default function FavoriteToggle({ producerId, initial = false }: Props) {
  const [fav, setFav] = useState<boolean>(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => setFav(initial), [initial])

  async function toggle() {
    setLoading(true)
    try {
      if (!fav) {
        const res = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ producerId }) })
        if (!res.ok) throw new Error('failed')
        setFav(true)
      } else {
        const res = await fetch(`/api/favorites/${producerId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('failed')
        setFav(false)
      }
    } catch (err) {
      console.error('favorite toggle error', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={toggle} disabled={loading} className={`px-3 py-1 text-sm rounded ${fav ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
      {fav ? 'お気に入り済み' : 'お気に入り'}
    </button>
  )
}
