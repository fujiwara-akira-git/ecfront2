import ClientProducts from './ClientProducts'
import { getProducts } from './_data'

// This page uses `fetch(..., { cache: 'no-store' })` so it cannot be statically
// prerendered. Force dynamic rendering to avoid Next.js DYNAMIC_SERVER_USAGE error.
export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  // データベースから商品を取得
  const products = await getProducts()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">新鮮野菜一覧</h1>
        <p className="text-gray-600">埼玉県産の新鮮で美味しい野菜をお届けします</p>
      </div>

      {products.length > 0 ? (
        <ClientProducts products={products} />
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">🥬</div>
          <p className="text-gray-500">現在、販売中の商品はございません</p>
          <p className="text-gray-400 text-sm mt-2">しばらくお待ちください</p>
        </div>
      )}
    </div>
  )
}
