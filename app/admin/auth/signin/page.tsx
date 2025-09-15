"use client"

import { useState, useEffect } from 'react'
import { signIn, signOut, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AdminSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // URLパラメータからエラーメッセージを取得
    const errorParam = searchParams.get('error')
    if (errorParam === 'insufficient_permissions') {
      setError('管理画面にアクセスするには管理者権限が必要です。一般ユーザアカウントではアクセスできません。')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 管理者専用ログイン
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          setError('管理者認証に失敗しました。管理者用のメールアドレスとパスワードを確認してください。')
        } else {
          setError('管理者権限を持つアカウントでのみログインできます。')
        }
      } else {
        // セッション確認後、管理画面にリダイレクト
        const session = await getSession()
        if (session?.user.role === 'ADMIN') {
          const returnTo = searchParams.get('callbackUrl') || '/admin'
          router.push(returnTo)
        } else {
          // 一般ユーザアカウントの場合は明確に拒否
          await signOut({ redirect: false })
          setError('管理画面にアクセスするには管理者権限が必要です。一般ユーザアカウントではログインできません。')
        }
      }
    } catch (error) {
      setError('認証エラーが発生しました。管理者にお問い合わせください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 背景の装飾要素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg w-full space-y-8 relative z-10">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              EP
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
            管理者ログイン
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Eagle Palace 管理システム
          </p>
          <div className="mt-4 h-1 w-20 bg-gradient-to-r from-blue-400 to-emerald-400 mx-auto rounded-full"></div>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  管理者メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 text-white placeholder-gray-300 text-lg"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🔐</span>
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 text-white placeholder-gray-300 text-lg"
                  placeholder="管理者パスワード"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-200 px-5 py-4 rounded-2xl text-sm font-medium">
                <div className="flex items-start gap-2">
                  <span className="text-red-400">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:via-purple-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>ログイン処理中...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl">🚀</span>
                  <span>管理システムにログイン</span>
                </div>
              )}
            </button>
          </form>

          {/* セキュリティ注意書き */}
          <div className="mt-8 p-5 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="text-amber-300 text-xl flex-shrink-0">🛡️</div>
              <div className="text-sm text-amber-100">
                <p className="font-bold mb-2 text-amber-200">セキュリティについて</p>
                <p className="leading-relaxed">
                  管理者アカウントでは店舗の重要な情報にアクセスできます。
                  ログイン情報は適切に管理し、共有しないでください。
                </p>
              </div>
            </div>
          </div>

          {/* 新規登録リンク */}
          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              管理者アカウントをお持ちでない方は
              <Link
                href="/admin/auth/signup"
                className="font-medium text-blue-300 hover:text-blue-200 ml-1"
              >
                新規登録
              </Link>
            </p>
          </div>
        </div>

        {/* 戻るリンク */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors duration-300 px-4 py-2 rounded-xl hover:bg-white/10 backdrop-blur-sm"
            >
              <span>←</span>
              管理画面に戻る
            </Link>
            <span className="text-gray-500">|</span>
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors duration-300 px-4 py-2 rounded-xl hover:bg-white/5 backdrop-blur-sm"
            >
              <span>🏠</span>
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}