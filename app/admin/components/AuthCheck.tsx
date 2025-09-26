'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface AuthCheckProps {
  children: React.ReactNode
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // 認証ページはチェックをスキップ
  const isAuthPage = pathname?.includes('/auth/') || false

  useEffect(() => {
    if (status === 'loading') return // まだロード中

    // 認証ページでない場合のみチェック
    if (!isAuthPage) {
      if (!session) {
        // 未ログインの場合、管理者ログインページにリダイレクト
  const currentUrl = (pathname || '/') + (typeof window !== 'undefined' ? window.location.search : '')
        router.push(`/admin/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`)
        return
      }

      if (session.user.role !== 'ADMIN') {
        // 管理者権限がない場合、セッションをクリアしてログインページにリダイレクト
        console.warn('一般ユーザが管理画面にアクセスしようとしました:', session.user.email)
        router.push('/admin/auth/signin?error=insufficient_permissions')
        return
      }
    }
  }, [session, status, router, isAuthPage, pathname])

  // ロード中の場合、ローディング画面を表示
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl animate-pulse mx-auto mb-4">
            EP
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">認証確認中...</p>
        </div>
      </div>
    )
  }

  // 認証ページまたは正しく認証されている場合、コンテンツを表示
  if (isAuthPage || (session && session.user.role === 'ADMIN')) {
    return <>{children}</>
  }

  // それ以外の場合、何も表示しない（リダイレクト処理中）
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl mx-auto mb-4">
          EP
        </div>
        <p className="text-gray-600 font-medium">認証中...</p>
      </div>
    </div>
  )
}