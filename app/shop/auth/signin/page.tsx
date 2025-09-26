"use client"
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const returnTo = (searchParams?.get('returnTo') as string) || '/shop'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('ログイン開始:', { email, returnTo })
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      try {
        console.log('ログイン結果 (raw):', result)
        console.log('ログイン結果 (詳細):', JSON.stringify(result))
      } catch (e) {
        console.log('ログイン結果 (stringify error)', e)
      }

      if (result?.error) {
        console.log('login error details:', { error: result.error, status: result.status, ok: result.ok, url: result.url })
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
      } else if (result?.ok) {
        console.log('ログイン成功、リダイレクト先:', returnTo)
        setTimeout(async () => {
          const session = await getSession()
          console.log('ログイン後のセッション情報:', session)
          if (session?.user?.id) {
            window.location.href = returnTo
          } else {
            window.location.href = returnTo
          }
        }, 1000)
      } else {
        setError('ログイン処理中にエラーが発生しました。')
      }
    } catch (err) {
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            会員ログイン
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Eagle Palace オンラインショップ
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">🔒</span>
              <span className="font-semibold text-blue-800">決済にはログインが必要です</span>
            </div>
            <p className="text-sm text-blue-700">
              安全な決済処理のため、会員登録またはログインをお願いしています
            </p>
          </div>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-lg"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-lg"
                placeholder="パスワード"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm font-medium">
                <span className="mr-2">❌</span>
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
                  ログイン中...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🚀</span>
                  ログインしてお買い物
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-gray-500 text-sm font-medium">または</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            
            <div className="space-y-3">
              <p className="text-gray-600 text-sm">
                アカウントをお持ちでない方は
              </p>
              <Link
                href="/shop/auth/signup"
                className="inline-block w-full bg-white border-2 border-emerald-500 text-emerald-600 py-3 px-6 rounded-xl font-bold hover:bg-emerald-50 transition-all text-center"
              >
                <span className="mr-2">✨</span>
                新規会員登録（無料）
              </Link>
            </div>
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="text-center space-y-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            <span>←</span>
            ショッピングを続ける
          </Link>
          <p className="text-xs text-gray-500">
            決済時には会員登録またはログインが必要です
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ShopSignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600">読み込み中...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}