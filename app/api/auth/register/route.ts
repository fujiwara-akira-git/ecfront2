import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
  const { name, email, password, phone, address, postalCode, state, city, userType = 'customer', adminCode } = await request.json()

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

    // 既存ユーザーのチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています。' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcryptjs.hash(password, 10)

    // データベースにユーザーを保存
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        postalCode,
        state,
        city,
        userType,
      },
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
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}
