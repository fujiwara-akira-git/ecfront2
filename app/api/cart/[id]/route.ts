import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/options'
import { prisma } from '@/lib/prisma'

// 個別カートアイテムの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { quantity } = await request.json()

    if (quantity <= 0) {
      // 数量が0以下の場合はアイテムを削除
      // Prisma の where にはユニークフィールドのみ指定する必要があるため
      // まずアイテムを取得して所有者を確認してから削除する
      const cartItem = await prisma.cartItem.findUnique({ where: { id } })
      if (!cartItem || cartItem.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'カートアイテムが見つかりません' },
          { status: 404 }
        )
      }

      await prisma.cartItem.delete({ where: { id } })
    } else {
      // 在庫確認
      const cartItem = await prisma.cartItem.findUnique({
        where: { id },
        include: {
          product: {
            include: { inventory: true }
          }
        }
      })

      if (!cartItem || cartItem.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'カートアイテムが見つかりません' },
          { status: 404 }
        )
      }

      if (!cartItem.product.inventory || cartItem.product.inventory.quantity < quantity) {
        return NextResponse.json(
          { error: '在庫が不足しています' },
          { status: 400 }
        )
      }

      // 数量を更新
      await prisma.cartItem.update({
        where: { id },
        data: { quantity }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('カートアイテム更新エラー:', error)
    return NextResponse.json(
      { error: 'カートアイテムの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// 個別カートアイテムの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const { id } = await params

    // DELETE: 同様にまず所有者を確認してから削除する
    const cartItem = await prisma.cartItem.findUnique({ where: { id } })
    if (!cartItem || cartItem.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'カートアイテムが見つかりません' },
        { status: 404 }
      )
    }

    await prisma.cartItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('カートアイテム削除エラー:', error)
    return NextResponse.json(
      { error: 'カートアイテムの削除に失敗しました' },
      { status: 500 }
    )
  }
}