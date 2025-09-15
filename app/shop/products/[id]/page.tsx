import { getProduct } from '../_data'
import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetailClient'

// This page uses `fetch(..., { cache: 'no-store' })` via `_data.ts` and cannot
// be statically prerendered. Force dynamic rendering to avoid Next.js errors.
export const dynamic = 'force-dynamic'

// Accept flexible params shape to satisfy Next.js generated PageProps checks
type Props = { params: Promise<{ id: string }> }

export default async function ProductDetailPage({ params }: Props) {
  const resolvedParams = await params
  const id = String(resolvedParams.id)
  
  // データベースから商品を取得
  const product = await getProduct(id)

  if (!product) {
    return notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <ProductDetailClient product={product} />
        </div>
      </div>
    </main>
  )
}
