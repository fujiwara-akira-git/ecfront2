import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
  const { name, email, password, phone, address, postalCode, userType = 'customer', adminCode } = await request.json()
    // 正規化: 大文字小文字や余分な空白での不一致を防ぐ
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email

    // バリデーション
    if (!name || !email || !password || !phone || !address || !postalCode) {
      return NextResponse.json(
        { message: 'すべてのフィールドを入力してください。' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '有効なメールアドレスを入力してください。' },
        { status: 400 }
      )
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'パスワードは6文字以上で入力してください。' },
        { status: 400 }
      )
    }

    // ユーザータイプのバリデーション
    const validUserTypes = ['customer', 'admin']
    if (!validUserTypes.includes(userType)) {
      return NextResponse.json(
        { message: '無効なユーザータイプです。' },
        { status: 400 }
      )
    }

    // 管理者登録の場合は確認コードをチェック
    if (userType === 'admin') {
      const requiredAdminCode = process.env.ADMIN_REGISTRATION_CODE
      if (!adminCode || adminCode !== requiredAdminCode) {
        return NextResponse.json(
          { message: '管理者確認コードが正しくありません。' },
          { status: 400 }
        )
      }
    }

    // 既存ユーザーのチェック（正規化済みメールで検索）
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています。' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcryptjs.hash(password, 10)

    // データベースにユーザーを保存（型安全な構築）
    // Prisma の User モデルに存在しないフィールド (state, city) は渡さない
    const userData: Prisma.UserCreateInput = {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address,
      postalCode,
      userType,
    }

    const newUser = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        postalCode: true,
        userType: true,
        createdAt: true
      }
    })

    console.log('新規ユーザー登録成功:', { 
  id: newUser.id,
  name: newUser.name,
  email: newUser.email,
  address: newUser.address,
  postalCode: newUser.postalCode,
  userType: newUser.userType 
    })

    // Server-side: create a NextAuth JWT and set it as an HttpOnly cookie so
    // the user is logged-in immediately after registration.
    try {
      const maxAge = 60 * 60 * 24 * 30 // 30 days
      const token = {
        sub: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: (newUser.userType || 'customer').toUpperCase(),
      }

      const secret = process.env.NEXTAUTH_SECRET
      if (!secret || typeof secret !== 'string') {
        throw new Error('NEXTAUTH_SECRET is not set')
      }
      const encoded = await encode({ token, secret, maxAge })

      const res = NextResponse.json(
        {
          message: 'アカウントが作成されました。ログインしました。',
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            address: newUser.address,
            postalCode: newUser.postalCode,
            userType: newUser.userType
          }
        },
        { status: 201 }
      )

      // Cookie name and Secure flag: prefer to determine by actual request protocol
      // so that in local HTTP dev we don't emit Secure cookies (which browsers
      // will ignore) even if NEXTAUTH_URL env was set to https for other reasons.
      let isHttpsRequest = false
      try {
        const u = new URL(request.url)
        isHttpsRequest = u.protocol === 'https:'
      } catch (e) {
        isHttpsRequest = false
      }

      const useSecure = (process.env.NODE_ENV === 'production') || isHttpsRequest || (process.env.NEXTAUTH_URL && String(process.env.NEXTAUTH_URL).startsWith('https'))
      const cookieName = useSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

      res.cookies.set(cookieName, encoded ?? '', {
        httpOnly: true,
        maxAge,
        path: '/',
        sameSite: 'lax',
        secure: !!useSecure,
      })

      return res
    } catch (err) {
      console.error('セッション発行エラー:', err)
      // フォールバック: cookie を返さず登録成功レスポンスのみ
      return NextResponse.json(
        {
          message: 'アカウントが作成されました。ログインしてください。',
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            address: newUser.address,
            postalCode: newUser.postalCode,
            userType: newUser.userType
          }
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}
