import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // データベース接続テスト
    const userCount = await (prisma as any).user.count()
    const productCount = await (prisma as any).product.count()
    const cartItemCount = await (prisma as any).cartItem?.count() || 0

    return NextResponse.json({
      success: true,
      data: {
        users: userCount,
        products: productCount,
        cartItems: cartItemCount
      },
      message: 'データベース接続成功'
    })
  } catch (error) {
    console.error('データベーステストエラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'データベース接続エラー',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}