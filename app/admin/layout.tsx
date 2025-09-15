import type { Metadata } from 'next'
import { SessionProvider } from '../components/SessionProvider'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/options'
import AuthCheck from './components/AuthCheck'
import SignOutButton from '../components/SignOutButton'

export const metadata: Metadata = {
  title: 'Eagle Palace 管理画面',
  description: '店舗・管理者向け統合管理システム',
}

export default async function AdminLayout({ 
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <SessionProvider session={session}>
      <AuthCheck>
      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* 管理画面専用ヘッダー */}
        <header className="bg-slate-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* 管理画面ロゴ */}
              <a href="/admin" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  EP
                </div>
                <div>
                  <div className="text-xl font-bold">Eagle Palace</div>
                  <div className="text-xs text-blue-300 font-medium">管理システム</div>
                </div>
              </a>

              {/* 管理画面ナビゲーション */}
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/admin" className="text-slate-300 hover:text-white font-medium transition-colors">
                  ダッシュボード
                </a>
                <a href="/admin/products" className="text-slate-300 hover:text-white font-medium transition-colors">
                  商品管理
                </a>
                <a href="/admin/inventory" className="text-slate-300 hover:text-white font-medium transition-colors">
                  在庫管理
                </a>
                <a href="/admin/pos" className="text-slate-300 hover:text-white font-medium transition-colors">
                  店舗販売
                </a>
                <a href="/admin/partners" className="text-slate-300 hover:text-white font-medium transition-colors">
                  取引先管理
                </a>
                <a href="/admin/accounting" className="text-slate-300 hover:text-white font-medium transition-colors">
                  経理処理
                </a>
              </nav>

              {/* ユーザー情報 */}
              <div className="flex items-center space-x-4">
                {session?.user ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {(session.user.name || session.user.email)?.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-sm font-medium text-white">
                          {session.user.name || session.user.email}
                        </div>
                        <div className="text-xs text-slate-300">
                          {session.user.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                        </div>
                      </div>
                    </div>
                    <SignOutButton className="text-sm text-slate-300 hover:text-white transition-colors">
                      ログアウト
                    </SignOutButton>
                  </div>
                ) : (
                  <a 
                    href="/admin/auth/signin" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    管理者ログイン
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* モバイルナビゲーション */}
          <div className="md:hidden border-t border-slate-700">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <nav className="flex justify-around">
                <a href="/admin" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">📊</span>
                  ダッシュボード
                </a>
                <a href="/admin/products" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">📦</span>
                  商品管理
                </a>
                <a href="/admin/inventory" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">�</span>
                  在庫管理
                </a>
                <a href="/admin/pos" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">💳</span>
                  店舗販売
                </a>
              </nav>
              <nav className="flex justify-around mt-2">
                <a href="/admin/partners" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">🤝</span>
                  取引先管理
                </a>
                <a href="/admin/accounting" className="flex flex-col items-center text-xs font-medium text-slate-300">
                  <span className="mb-1">💰</span>
                  経理処理
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* サイドバーとメインコンテンツ */}
        <div className="flex-1 flex">
          {/* サイドバー（デスクトップのみ） */}
          <aside className="hidden lg:flex lg:flex-shrink-0">
            <div className="w-64 bg-white border-r border-gray-200">
              <nav className="mt-5 px-2">
                <div className="space-y-1">
                  <a 
                    href="/admin" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-50"
                  >
                    <span className="mr-3">📊</span>
                    ダッシュボード
                  </a>
                  <a 
                    href="/admin/products" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span className="mr-3">📦</span>
                    商品管理
                  </a>
                  <a 
                    href="/admin/inventory" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span className="mr-3">�</span>
                    在庫管理
                  </a>
                  <a 
                    href="/admin/pos" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span className="mr-3">💳</span>
                    店舗販売(POS)
                  </a>
                  <a 
                    href="/admin/partners" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span className="mr-3">🤝</span>
                    取引先管理
                  </a>
                  <a 
                    href="/admin/accounting" 
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <span className="mr-3">�</span>
                    経理処理(freee)
                  </a>
                </div>

                <div className="mt-8">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    設定
                  </h3>
                  <div className="mt-1 space-y-1">
                    <a 
                      href="/admin/settings" 
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="mr-3">⚙️</span>
                      システム設定
                    </a>
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      </AuthCheck>
    </SessionProvider>
  )
}