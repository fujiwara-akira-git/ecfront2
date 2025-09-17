import Link from 'next/link'
import Image from 'next/image'
import AddToCartButton from '@/app/shop/producer/AddToCartButton'
import FavoriteToggle from '@/app/shop/producer/FavoriteToggle'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/options'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProducerPage({ params }: Props) {
  const { id } = await params

  const producer = await prisma.producer.findUnique({
    where: { id },
    include: { products: { where: { isActive: true }, take: 20, include: { inventory: true } } }
  })

  const session = await getServerSession(authOptions)

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
          {session?.user?.id && (
            <div className="mt-4">
              <FavoriteToggle producerId={producer.id} initial={!!(await prisma.favoriteProducer.findFirst({ where: { userId: session.user.id, producerId: producer.id } }))} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium mb-4">出品中の商品</h2>
            {producer.products.length === 0 ? (
            <p className="text-gray-600">現在出品中の商品はありません。</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {producer.products.map((p) => {
                const qty = p.inventory?.quantity ?? 0
                const isOut = qty <= 0
                let imgSrc = '/images/placeholder.svg'
                if (typeof p.image === 'string') {
                  const s = p.image.trim()
                  // only accept absolute http(s) or root-relative paths
                  if (s.startsWith('/') || s.match(/^https?:\/\//i)) {
                    imgSrc = s
                  } else {
                    // log suspicious image values for investigation (include product id)
                    console.warn('[ProducerPage] invalid product.image for product', p.id, ', using placeholder:', s)
                  }
                }
                return (
                  <div key={p.id} className={`flex items-center gap-3 border rounded-lg p-3 ${isOut ? 'opacity-60' : ''}`}>
                    <Link href={`/shop/products/${p.id}`} className="flex items-center gap-3 flex-1">
                      <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <Image src={imgSrc} alt={p.name} className="object-cover" width={96} height={96} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{p.name}</div>
                          {/* stock badge */}
                          {(() => {
                            const minStock = p.inventory?.minStock ?? 0
                            if (qty <= 0) {
                              return <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">在庫なし</span>
                            }
                            if (qty <= Math.max(minStock, 5)) {
                              return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">残りわずか: {qty} 件</span>
                            }
                            return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">在庫: {qty} 件</span>
                          })()}
                        </div>
                        <div className="text-sm text-gray-600">¥{p.price.toLocaleString()}</div>
                      </div>
                    </Link>
                    <div className="flex-shrink-0">
                      <AddToCartButton product={p as any} disabled={isOut} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
