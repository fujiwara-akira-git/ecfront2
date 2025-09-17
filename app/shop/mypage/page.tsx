"use client"

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function MyPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>読み込み中...</p>

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">マイページ</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium mb-2">アカウント情報</h2>
          <p className="text-sm text-gray-700">{session?.user?.name}</p>
          <p className="text-sm text-gray-700">{session?.user?.email}</p>
          <div className="mt-4">
            <Link href="/shop/mypage/orders" className="text-green-600 hover:underline">注文履歴を見る</Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium mb-2">配送・支払い</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li><Link href="/shop/mypage/addresses" className="text-green-600 hover:underline">配送先住所の管理</Link></li>
            <li><Link href="/shop/mypage/payment-methods" className="text-green-600 hover:underline">支払い方法の管理</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
