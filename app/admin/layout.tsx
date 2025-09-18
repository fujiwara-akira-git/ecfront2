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
              {/* 管理画面ロゴ（表示のみ、リンク削除） */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  EP
                </div>
                <div>
                  <div className="text-xl font-bold">Eagle Palace</div>
                  <div className="text-xs text-blue-300 font-medium">管理システム</div>
                </div>
              </div>

              {/* 管理ナビは非表示（リンク削除） */}
              <nav className="hidden md:flex items-center space-x-6">
                <span className="text-slate-300 font-medium">ダッシュボード</span>
                <span className="text-slate-300 font-medium">商品管理</span>
                <span className="text-slate-300 font-medium">在庫管理</span>
                <span className="text-slate-300 font-medium">店舗販売</span>
                <span className="text-slate-300 font-medium">取引先管理</span>
                <span className="text-slate-300 font-medium">経理処理</span>
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
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    disabled
                    title="管理画面は利用不可"
                  >
                    管理者ログイン
                  </button>
                )}
              </div>
            </div>
          </div>

              {/* モバイルナビは非表示 */}
        </header>

        {/* サイドバーとメインコンテンツ */}
        <div className="flex-1 flex">
          {/* サイドバー（デスクトップのみ） */}
          <aside className="hidden lg:flex lg:flex-shrink-0">
            <div className="w-64 bg-white border-r border-gray-200">
              <nav className="mt-5 px-2">
                <div className="space-y-1">
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-900">
                    <span className="mr-3">📊</span>
                    ダッシュボード
                  </div>
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600">
                    <span className="mr-3">📦</span>
                    商品管理
                  </div>
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600">
                    <span className="mr-3">�</span>
                    在庫管理
                  </div>
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600">
                    <span className="mr-3">💳</span>
                    店舗販売(POS)
                  </div>
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600">
                    <span className="mr-3">🤝</span>
                    取引先管理
                  </div>
                  <div className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600">
                    <span className="mr-3">�</span>
                    経理処理(freee)
                  </div>
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