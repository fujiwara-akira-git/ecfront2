
// 'use client' 削除（サーバーコンポーネント化）
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import ProductsPage from './products/page'

export default function ShopPage() {
    return (
      <div className="bg-gray-50">
        {/* ヒーローセクション（そのまま残す場合はここに記述） */}
        <section className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                新鮮な農産物を<br />
                <span className="text-emerald-100">直接お届け</span>
              </h1>
              <p className="text-xl text-emerald-100 mb-8">
                生産者が丹精込めて育てた季節の野菜・果物を、オンラインで簡単にお買い物できます。
              </p>
              <div className="flex gap-4 justify-center">
                <Link 
                  href="/shop/products" 
                  className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-bold hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  商品を見る
                </Link>
                <Link 
                  href="/shop/cart" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-emerald-600 transition-colors"
                >
                  カートを見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* DB商品一覧（おすすめ商品セクションの代替） */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductsPage />
          </div>
        </section>
      </div>
    )
}
