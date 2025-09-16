
'use client'
export const dynamic = 'force-dynamic'

import { useCart } from '../../contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
// useSearchParams avoided to prevent Suspense requirement

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
}

export default function CheckoutPage() {
  // avoid useSearchParams Suspense requirement by reading from window.location
  const getSearchParams = () => {
    if (typeof window === 'undefined') return new URLSearchParams('')
    return new URLSearchParams(window.location.search)
  }
  const searchParams = getSearchParams()
  const { state, getSubtotal, getItemCount } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [shippingAddress, setShippingAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [saveCard, setSaveCard] = useState(true)
  const [deliveryService, setDeliveryService] = useState(searchParams.get('deliveryService') || 'japanpost')
  const [shippingFee, setShippingFee] = useState(Number(searchParams.get('shippingFee')) || 800)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)

  // カートの総重量を計算（仮定: 各商品500g）
  const calculateTotalWeight = useCallback(() => {
    const defaultWeightPerItem = 500 // grams
    return state.items.reduce((total, item) => total + (item.quantity * defaultWeightPerItem), 0)
  }, [state.items])

  // 配送料を計算
  const calculateShippingFee = useCallback(async (service: string, address: string, postalCode: string) => {
    if (!address.trim() || !postalCode.trim()) return

    setIsCalculatingShipping(true)
    try {
      const weightGrams = calculateTotalWeight()
      const response = await fetch('/api/delivery/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: { postalCode: '100-0001', address: '東京都中央区' },
          destination: { postalCode, address },
          weightGrams
        })
      })

      if (response.ok) {
        const data = await response.json()
        const rates = data.rates || []
        
        // 指定されたサービスからレートを取得
        const serviceRate = rates.find((rate: any) => rate.provider === service)
        if (serviceRate) {
          setShippingFee(serviceRate.amount)
        } else if (rates.length > 0) {
          // 該当サービスがない場合は最初のレートを使用
          setShippingFee(rates[0].amount)
        }
      }
    } catch (error) {
      console.error('配送料計算エラー:', error)
      // エラー時はデフォルト値を維持
    } finally {
      setIsCalculatingShipping(false)
    }
  }, [calculateTotalWeight])

  // ユーザー情報・クエリ値を初期値にセット
  useEffect(() => {
    const fetchUserInfo = async () => {
  const queryAddress = searchParams.get('address') || '';
  const queryPhone = searchParams.get('phone') || '';
  const queryPostalCode = searchParams.get('postalCode') || '';
  const queryDeliveryService = searchParams.get('deliveryService') || 'japanpost';
  const queryShippingFee = Number(searchParams.get('shippingFee')) || 800;

      if (session?.user?.id) {
        try {
          const userUrl = (typeof window !== 'undefined' && window.location?.origin) ? `${window.location.origin}/api/user` : '/api/user'
          const response = await fetch(userUrl, { credentials: 'include' })
          if (response.ok) {
            const userData = await response.json()
            setUserInfo(userData)
            // クエリ値があれば優先、なければDB値
            setShippingAddress(queryAddress || userData.address || '')
            setPhoneNumber(queryPhone || userData.phone || '')
            setPostalCode(queryPostalCode || userData.postalCode || '')
            setDeliveryService(queryDeliveryService)
            setShippingFee(queryShippingFee)
          } else {
            const text = await response.text().catch(() => '')
            console.warn('[checkout] /api/user returned non-ok', response.status, text)
          }
        } catch (error) {
          console.error('ユーザー情報取得エラー:', error)
        }
      } else {
        // 未ログイン時はクエリ値のみ
        setShippingAddress(queryAddress)
        setPhoneNumber(queryPhone)
        setPostalCode(queryPostalCode)
        setDeliveryService(queryDeliveryService)
      }
    }
    if (status === 'authenticated' || status === 'unauthenticated') {
      fetchUserInfo()
    }
  }, [session, status, searchParams])

  // 配送サービスまたは住所変更時に配送料を再計算
  useEffect(() => {
    if (shippingAddress && postalCode && deliveryService) {
      calculateShippingFee(deliveryService, shippingAddress, postalCode)
    }
  }, [deliveryService, shippingAddress, postalCode, calculateShippingFee])

  // 未ログインの場合はログインページにリダイレクト
  useEffect(() => {
    console.log('Checkout - セッション状態変化:', { 
      status, 
      email: session?.user?.email,
      hasSession: !!session 
    })
    
    if (status !== 'loading' && !session?.user?.id) {
      console.log('Checkout - 未ログイン検出、ログインページにリダイレクト')
      router.push('/shop/auth/signin?returnTo=/shop/checkout')
    } else if (status === 'authenticated' && session?.user?.id) {
      console.log('Checkout - ログイン状態確認完了')
    }
  }, [session, status, router])

  const handlePayment = async () => {
    // 住所と電話番号の検証
    if (!shippingAddress.trim()) {
      alert('配送先住所を入力してください')
      return
    }
    if (!phoneNumber.trim()) {
      alert('電話番号を入力してください')
      return
    }

    setIsLoading(true)
    try {
      // 注文データを構築（送料を含む）
      // ユーザー入力値を優先してcustomerInfoにセット
      const orderData = {
        items: state.items.map(item => ({
          name: item.name,
          sku: item.id.toString(),
          quantity: item.quantity,
          unitPrice: item.price
        })),
        currency: 'jpy',
        shippingFee: shippingFee, // 配送料を反映
        deliveryService: deliveryService, // 配送方法を反映
        customerInfo: {
          address: shippingAddress,
          postalCode: postalCode,
          phone: phoneNumber,
          email: session?.user?.email || '',
          name: session?.user?.name || '',
        },
        metadata: {
          userId: session?.user?.id || '',
          userName: session?.user?.name || '',
          shippingAddress: shippingAddress,
          postalCode: postalCode,
          phoneNumber: phoneNumber,
          deliveryService: deliveryService,
          shippingFee: shippingFee.toString(),
          weightGrams: calculateTotalWeight().toString(),
          saveCard: saveCard ? 'true' : 'false'
        }
      }

      // 決済セッションを作成
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: orderData })
      })

      if (!response.ok) {
        throw new Error('決済セッションの作成に失敗しました')
      }

      const { checkoutUrl } = await response.json()
      
      if (checkoutUrl) {
        // Stripeの決済ページにリダイレクト
        window.location.href = checkoutUrl
      } else {
        throw new Error('決済URLの取得に失敗しました')
      }
    } catch (error) {
      console.error('決済エラー:', error)
      alert('決済処理中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ローディング中またはリダイレクト中
  if (status === 'loading' || !session?.user?.id) {
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

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">カートが空です</h2>
            <p className="text-gray-600 mb-6">商品を追加してから決済にお進みください</p>
            <button
              onClick={() => router.push('/shop/products')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              商品を見る
            </button>
          </div>
        </div>
      </div>
    )
  }

  const subtotal = getSubtotal()
  const total = subtotal + shippingFee

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <span className="mr-2">←</span>
            カートに戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">決済</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 注文内容 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6">注文内容</h2>
            
            <div className="space-y-4">
              {state.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🥬</div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        ¥{item.price.toLocaleString()} × {item.quantity}個
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">¥{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">商品数</span>
                <span>{getItemCount()}個</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">送料（{deliveryService === 'yamato' ? 'ヤマト' : '日本郵便'}）</span>
                <span>
                  {isCalculatingShipping ? '計算中...' : `¥${shippingFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between font-medium text-lg pt-2 border-t">
                <span>合計</span>
                <span>
                  {isCalculatingShipping ? '計算中...' : `¥${total.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* 決済情報 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6">決済情報</h2>
            
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">ログイン中</span>
                </div>
                <p className="text-sm text-green-700">{session.user.email}</p>
                <p className="text-sm text-green-700">{session.user.name}</p>
              </div>
            </div>

            <form className="space-y-4">

              {/* 電話番号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={userInfo?.phone ? "データベースから取得した電話番号が入力されています" : "090-1234-5678"}
                  required
                />
              </div>
              {/* ...existing code... */}
              {/* 郵便番号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: 123-4567"
                  required
                />
              </div>
              {/* 都道府県 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
                <input
                  type="text"
                  value={searchParams.get('state') || ''}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                  placeholder="データベースから取得した都道府県が入力されています"
                  required
                />
              </div>
              {/* 市区郡 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">市区郡</label>
                <input
                  type="text"
                  value={searchParams.get('city') || ''}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                  placeholder="データベースから取得した市区郡が入力されています"
                  required
                />
              </div>
              {/* 住所 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={userInfo?.address ? "データベースから取得した住所が入力されています" : "配送先の住所を入力してください"}
                  required
                />
              </div>

              {/* 配送サービス選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配送サービス</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryService"
                      value="yamato"
                      checked={deliveryService === 'yamato'}
                      onChange={(e) => setDeliveryService(e.target.value)}
                      className="mr-2"
                    />
                    ヤマト運輸
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryService"
                      value="japanpost"
                      checked={deliveryService === 'japanpost'}
                      onChange={(e) => setDeliveryService(e.target.value)}
                      className="mr-2"
                    />
                    日本郵便
                  </label>
                </div>
                {isCalculatingShipping && (
                  <p className="text-sm text-gray-500 mt-1">配送料を計算中...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支払い方法
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="payment" value="card" className="mr-2" defaultChecked />
                    クレジットカード
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="payment" value="bank" className="mr-2" />
                    銀行振込
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="payment" value="cod" className="mr-2" />
                    代金引換
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="w-4 h-4"
                    />
                    このカード情報を保存して次回以降の決済で利用する
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isLoading || isCalculatingShipping}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? '処理中...' : isCalculatingShipping ? '配送料計算中...' : `¥${total.toLocaleString()} を支払う`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}