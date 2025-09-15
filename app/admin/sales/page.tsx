 'use client'

import { useState, useEffect } from 'react'

export default function SalesPage() {
  // Avoid generating Date on server — set on client mount to prevent hydration mismatch
  const [date, setDate] = useState<string>('')
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0])
  }, [])

  const sampleTotal = 12345

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">売上確認</h1>
            <a href="/admin" className="text-blue-600 hover:text-blue-800">← 戻る</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white p-4 rounded shadow mb-6 flex items-center gap-4">
          <label className="text-sm">日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            総売上
            <div className="text-2xl font-bold">¥{new Intl.NumberFormat('ja-JP').format(sampleTotal)}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            取引件数
            <div className="text-2xl font-bold">12件</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            平均単価
            <div className="text-2xl font-bold">¥{new Intl.NumberFormat('ja-JP').format(Math.round(sampleTotal / 12))}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
