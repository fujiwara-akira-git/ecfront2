import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type Props = {
  params: { id: string }
}

export default async function ProducerPage({ params }: Props) {
  const { id } = params

  const producer = await prisma.producer.findUnique({
    where: { id },
    include: { products: { where: { isActive: true }, take: 20 } }
  })

  if (!producer) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">生産者が見つかりません</h1>
          <p className="mt-2 text-gray-600">指定された生産者は存在しないか、非公開になっています。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/shop" className="mb-4 inline-block text-gray-600">← ショップに戻る</Link>
        <h1 className="text-3xl font-bold mb-4">{producer.name}</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-medium">概要</h2>
          <p className="mt-2 text-gray-700">{producer.description || '説明は登録されていません'}</p>
          {producer.address && <p className="mt-2 text-sm text-gray-600">住所: {producer.address}</p>}
          {producer.phone && <p className="mt-1 text-sm text-gray-600">電話: {producer.phone}</p>}
          {producer.email && <p className="mt-1 text-sm text-gray-600">メール: {producer.email}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium mb-4">出品中の商品</h2>
          {producer.products.length === 0 ? (
            <p className="text-gray-600">現在出品中の商品はありません。</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {producer.products.map((p) => (
                <Link key={p.id} href={`/shop/products/${p.id}`} className="block border rounded-lg p-3 hover:shadow">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-600">¥{p.price.toLocaleString()}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
