"use client"

import { useState } from 'react'

export default function SearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(q)
  }

  return (
    <form onSubmit={submit} className="flex items-center">
      <input
        className="w-56 px-3 py-2 border rounded-l-md text-sm"
        placeholder="商品を検索"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="bg-white border-l px-3 py-2 rounded-r-md text-sm">検索</button>
    </form>
  )
}
