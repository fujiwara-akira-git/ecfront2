'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ShopSignUpPage() {
  // (自動上書きに切り替え) ユーザー編集フラグは不要

  // 郵便番号から都道府県・市区郡自動セット
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      const data = await res.json()
      if (data && data.results && data.results.length > 0) {
        const result = data.results[0]
        // Normalize address3: remove duplicated city prefix when present
        let addr3 = result.address3 || ''
        if (result.address2 && addr3.startsWith(result.address2)) {
          addr3 = addr3.slice(result.address2.length).trim()
        }
        // Always overwrite state/city/address when postal code lookup runs
        setFormData(f => ({
          ...f,
          state: result.address1 || f.state,
          city: result.address2 || f.city,
          address: addr3 || f.address
        }))
      }
    } catch {
      // ignore error: 郵便番号API失敗時は何もしない
    }
  }
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    address: '',
    postalCode: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // (自動上書き) ユーザー編集フラグは使わない
    // 郵便番号が7桁数字なら自動住所セット
    if (name === "postalCode" && /^[0-9]{7}$/.test(value)) {
      fetchAddressFromPostalCode(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // バリデーション
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setIsLoading(false)
      return
    }

    try {
      // ユーザー登録API呼び出し
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          state: formData.state,
          city: formData.city,
          address: formData.address,
          postalCode: formData.postalCode,
          password: formData.password,
          userType: 'customer'
        }),
      })

      if (response.ok) {
        // 登録成功後、自動ログイン
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false
        })

        if (result?.ok) {
          router.push('/shop')
        } else {
          setError('登録は完了しましたが、ログインに失敗しました。再度ログインしてください。')
        }
      } else {
        const data = await response.json()
        setError(data.message || '登録に失敗しました')
      }
    } catch (error) {
      setError('エラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl">
              🌱
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            会員登録
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            Eagle Palace オンラインショップ
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">🔒</span>
              <span className="font-semibold text-blue-800">決済には会員登録が必要です</span>
            </div>
            <p className="text-sm text-blue-700">
              安全なお取引のため、会員登録をお願いしています。登録後すぐにお買い物できます。
            </p>
          </div>
        </div>

        {/* 登録フォーム */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">氏名</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="田中太郎"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">郵便番号</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                required
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="123-4567"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">都道府県</label>
              <input
                id="state"
                name="state"
                type="text"
                required
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="東京都"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">市区郡</label>
              <input
                id="city"
                name="city"
                type="text"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="千代田区"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">住所</label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="川田谷1234-5"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="パスワード（6文字以上）"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード確認
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="パスワード（確認）"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 focus:outline-none focus:ring-3 focus:ring-emerald-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  登録中...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🚀</span>
                  今すぐ会員登録してお買い物
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              既にアカウントをお持ちの方は
              <a
                href="/shop/auth/signin"
                className="font-medium text-emerald-600 hover:text-emerald-700 ml-1"
              >
                ログイン
              </a>
            </p>
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="text-center">
          <a
            href="/shop"
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            ← ショップに戻る
          </a>
        </div>
      </div>
    </div>
  )
}