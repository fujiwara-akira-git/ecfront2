import type { Metadata } from 'next'
import Link from 'next/link'
import { SessionProvider } from '../components/SessionProvider'
import { CartProvider } from '../contexts/CartContext'
import { ToastProvider } from '../contexts/ToastContext'
import CartBadge from '../components/CartBadge'
import SignOutButton from '../components/SignOutButton'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/options'

// このレイアウトはサーバーサイドで `getServerSession` を使用するため
// プリレンダリングによる静的生成を防ぐ（動的レンダリングを強制）
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Eagle Palace ショップ',
  description: '新鮮な農産物をオンラインでお買い物',
}

export default async function ShopLayout({ 
  children,
}: {
  children: React.ReactNode
}) {
  let session = null as any
  try {
    session = await getServerSession(authOptions)
  } catch (err) {
    // 次認証エラー（例: JWT の復号化失敗）が発生した場合でもサーバをクラッシュさせない。
    // 根本的な対処は `NEXTAUTH_SECRET` 等の環境変数を確認してください。
    // eslint-disable-next-line no-console
    console.error('[next-auth][error][getServerSession]', err)
    session = null
  }

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            {/* ECショップ専用ヘッダー */}
            <header className="bg-white/95 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                  {/* ロゴリンクは不要のため削除（レイアウト維持のためプレースホルダ） */}
                  <div className="w-12" />

                  {/* デスクトップナビゲーション - 余裕のあるスペース */}
                  <nav className="hidden md:flex items-center space-x-12">
                    <Link href="/shop" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors text-lg">ホーム</Link>
                    <Link href="/shop/products" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors text-lg">商品一覧</Link>
                    <Link href="/shop/producers" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors text-lg">生産者</Link>
                    <Link href="/shop/cart" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors text-lg">カート</Link>
                  </nav>

                  {/* ユーザーセクション - ログインを推奨する表示 */}
                  <div className="flex items-center space-x-6">
                    <CartBadge />
                    
                    {session?.user ? (
                      <div className="flex items-center space-x-6 bg-emerald-50 rounded-full px-6 py-3">
                        <span className="text-emerald-800 font-medium">
                          {session.user.name || session.user.email}さん
                        </span>
                        <SignOutButton className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                          ログアウト
                        </SignOutButton>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500 text-sm hidden md:inline">決済にはログインが必要です</span>
                        <Link href="/shop/auth/signin" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">ログイン</Link>
                        <Link href="/shop/auth/signup" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm">会員登録</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* モバイルナビゲーション - よりスペースを空けて */}
              <div className="md:hidden border-t bg-white">
                <div className="max-w-7xl mx-auto px-6 py-4">
                  <nav className="flex justify-around">
                    <Link href="/shop" className="flex flex-col items-center font-medium text-gray-600 hover:text-emerald-600 transition-colors">
                      <span className="text-2xl mb-2">🏠</span>
                      <span className="text-sm">ホーム</span>
                    </Link>
                    <Link href="/shop/products" className="flex flex-col items-center font-medium text-gray-600 hover:text-emerald-600 transition-colors">
                      <span className="text-2xl mb-2">🛒</span>
                      <span className="text-sm">商品</span>
                    </Link>
                    <Link href="/shop/producers" className="flex flex-col items-center font-medium text-gray-600 hover:text-emerald-600 transition-colors">
                      <span className="text-2xl mb-2">🌾</span>
                      <span className="text-sm">生産者</span>
                    </Link>
                    <Link href="/shop/cart" className="flex flex-col items-center font-medium text-gray-600 hover:text-emerald-600 transition-colors">
                      <span className="text-2xl mb-2">🛍️</span>
                      <span className="text-sm">カート</span>
                    </Link>
                  </nav>
                </div>
              </div>
            </header>

            {/* メインコンテンツ */}
            <main className="flex-1">
              {children}
            </main>

            {/* ECショップ専用フッター */}
            <footer className="bg-white border-t">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                        EP
                      </div>
                      <span className="font-bold text-gray-900">Eagle Palace</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      新鮮で安心な地元産品を、生産者から直接お届けします。
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">ショッピング</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><Link href="/shop/products" className="hover:text-emerald-600">商品一覧</Link></li>
                      <li><Link href="/shop/cart" className="hover:text-emerald-600">カート</Link></li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">サポート</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><a href="#" className="hover:text-emerald-600">お問い合わせ</a></li>
                      <li><a href="#" className="hover:text-emerald-600">配送について</a></li>
                      <li><a href="#" className="hover:text-emerald-600">返品・交換</a></li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t pt-6 mt-8 text-center text-sm text-gray-500">
                  © {new Date().getFullYear()} Eagle Palace — 地元産品をお届けします
                </div>
              </div>
            </footer>
          </div>
        </CartProvider>
      </ToastProvider>
    </SessionProvider>
  )
}