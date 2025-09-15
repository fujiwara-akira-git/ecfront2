import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // 管理画面へのアクセス処理
    if (req.nextUrl.pathname.startsWith('/admin')) {
      // 認証ページは通す
      if (req.nextUrl.pathname.includes('/auth/')) {
        return
      }
      
      // 未認証の場合は管理者ログイン画面にリダイレクト
      if (!req.nextauth.token) {
        const url = new URL('/admin/auth/signin', req.url)
        url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search)
        return NextResponse.redirect(url)
      }
      
      // 管理者権限がない場合もリダイレクト
      if (req.nextauth.token.role !== 'ADMIN') {
        const url = new URL('/admin/auth/signin', req.url)
        url.searchParams.set('error', 'insufficient_permissions')
        return NextResponse.redirect(url)
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Adminルートは管理者ロールが必要
        if (pathname.startsWith('/admin')) {
          return token?.role === 'ADMIN'
        }

        // Allow public access to checkout success page
        if (pathname.startsWith('/shop/checkout/success')) {
          return true
        }

        // Shop内の認証が必要なページ（決済の一部）
        if (pathname.startsWith('/shop/checkout') || pathname.startsWith('/shop/payment')) {
          return !!token
        }

        // 認証ページとAPIは常にアクセス可能
        if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
          return true
        }

        // ルートページ、ショップページは常にアクセス可能
        if (pathname === '/' || pathname.startsWith('/shop')) {
          return true
        }

        return !!token
      }
    }
  }
)

export const config = {
  matcher: ['/admin/:path*', '/shop/checkout/:path*', '/shop/payment/:path*']
}
