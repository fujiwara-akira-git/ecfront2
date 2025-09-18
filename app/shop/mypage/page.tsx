import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/options'
import { prisma } from '@/lib/prisma'
import type { Order, FavoriteProducer, Producer } from '@prisma/client'

export default async function MyPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold">マイページ</h1>
          <p className="mt-4 text-gray-600">マイページを表示するにはログインが必要です。</p>
          <div className="mt-4">
            <Link href="/shop/auth/signin" className="text-emerald-600 font-medium">ログインする</Link>
          </div>
        </div>
      </div>
    )
  }

  // Try to load recent orders for this user (if order model exists)
  let orders: Order[] = []
  try {
    orders = await prisma.order.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 10 })
  } catch (err) {
    // ignore if no order model or DB issue; show empty state
    // eslint-disable-next-line no-console
    console.warn('[MyPage] could not load orders', err)
    orders = []
  }

  // Try to load favorite producers (if model exists)
  let favorites: (FavoriteProducer & { producer: Producer })[] = []
  try {
    favorites = await prisma.favoriteProducer.findMany({ where: { userId: session.user.id }, include: { producer: true } })
  } catch (err) {
    // model might not exist yet; ignore
    // eslint-disable-next-line no-console
    console.warn('[MyPage] could not load favorite producers', err)
    favorites = []
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">マイページ</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium">アカウント情報</h2>
          <p className="mt-2 text-gray-700">{session.user.name || session.user.email}</p>
          <p className="mt-1 text-sm text-gray-600">{session.user.email}</p>
          <div className="mt-4">
            <Link href="/shop/mypage/profile" className="text-emerald-600 font-medium">プロフィールを編集</Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium mb-4">最近の注文</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600">注文履歴はありません。</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((o: any) => (
                <li key={o.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">注文 #{o.id}</div>
                      <div className="text-sm text-gray-600">合計: ¥{(o.total || o.amount_total || 0).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-medium mb-4">お気に入りの生産者</h2>
          {favorites.length === 0 ? (
            <p className="text-gray-600">お気に入りの生産者は登録されていません。</p>
          ) : (
            <ul className="space-y-3">
              {favorites.map((f: any) => (
                <li key={f.id} className="border rounded-lg p-3">
                  <Link href={`/shop/producer/${f.producer.id}`} className="font-medium">{f.producer.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

