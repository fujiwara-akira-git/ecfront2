
'use client'
export const dynamic = 'force-dynamic'

import { useCart } from '../../contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CartPage() {
  const { state, updateQuantity, removeItem, getSubtotal, getItemCount, syncWithDatabase } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()

  // ログイン後の同期処理とデバッグ
  useEffect(() => {
    console.log('カートページ - セッション状態:', {
      status,
      userId: session?.user?.id,
      email: session?.user?.email,
      hasSession: !!session
    })
    
    // 初回ログイン後のみ同期処理を実行
    if (session?.user?.id && status === 'authenticated') {
      console.log('ログイン済み - カート同期実行')
      syncWithDatabase()
    }
  }, [session?.user?.id, status, session, syncWithDatabase])

  const handleCheckout = () => {
    console.log('Checkout開始:', { 
      sessionUserId: session?.user?.id, 
      sessionStatus: status,
      itemsLength: state.items.length,
      sessionData: session 
    })

    // セッション状態が不明な場合は少し待つ
    if (status === 'loading') {
      console.log('セッション読み込み中、少し待ってから再試行')
      setTimeout(() => handleCheckout(), 500)
      return
    }

    if (!session?.user?.id || status !== 'authenticated') {
      const currentPath = '/shop/cart'
      const redirectUrl = `/shop/auth/signin?returnTo=${encodeURIComponent(currentPath)}`
      console.log('未ログイン、ログインページにリダイレクト:', redirectUrl)
      router.push(redirectUrl)
      return
    }

    const outOfStockItems = state.items.filter(item => !item.isInStock || (item.stock || 0) < item.quantity)
    if (outOfStockItems.length > 0) {
      console.log('在庫不足商品:', outOfStockItems)
      alert(`以下の商品が在庫不足です：\n${outOfStockItems.map(item => item.name).join('\n')}`)
      return
    }

  console.log('配送先情報入力画面にリダイレクト')
  router.push('/shop/shipping')
  }

  if (status === 'loading' || state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ショッピングカート</h1>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${session?.user?.id ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600">
                {session?.user?.id ? `ログイン中: ${session.user.email}` : 'ゲストとして利用中'}
              </span>
            </div>
            {session?.user?.id && (
              <button
                onClick={syncWithDatabase}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                同期
              </button>
            )}
          </div>
        </div>

        {state.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">カートが空です</h2>
            <p className="text-gray-600 mb-6">商品を追加してお買い物を楽しみましょう</p>
            <button
              onClick={() => router.push('/shop/products')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              商品を見る
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {state.items.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">🥬</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">生産者: {item.producerName}</p>
                      <p className="text-sm text-green-600 font-medium">¥{item.price.toLocaleString()}</p>
                      
                      {item.isInStock !== undefined && (
                        <div className="mt-1">
                          {!item.isInStock || (item.stock || 0) <= 0 ? (
                            <span className="text-xs text-red-500 font-medium">在庫切れ</span>
                          ) : (item.stock || 0) <= 5 ? (
                            <span className="text-xs text-orange-500 font-medium">残り{item.stock}点</span>
                          ) : (
                            <span className="text-xs text-green-500 font-medium">在庫あり</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.stock !== undefined && item.quantity >= item.stock}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-600">小計</span>
                    <span className="font-medium">¥{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">注文サマリー</h2>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">商品数</span>
                    <span>{getItemCount()}個</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">小計</span>
                    <span>¥{getSubtotal().toLocaleString()}</span>
                  </div>
                  {/* 送料は決済前未定のため非表示 */}
                </div>
                
                {/* 合計金額（送料込み）は決済前未定のため非表示 */}

                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  配送情報を入力
                </button>
                
                {!session?.user?.id && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    ※ 決済にはログインが必要です
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}