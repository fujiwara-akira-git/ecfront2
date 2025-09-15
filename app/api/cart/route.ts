import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/options'
import { prisma } from '@/lib/prisma'

// カート取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            producer: true,
            inventory: true
          }
        }
      }
    })

    const formattedItems = cartItems.map((item: any) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      producerName: item.product.producer?.name || '不明',
      description: item.product.description || '',
      stock: item.product.inventory?.quantity || 0,
      isInStock: (item.product.inventory?.quantity || 0) > 0
    }))

    return NextResponse.json({ items: formattedItems })
  } catch (error) {
    console.error('カート取得エラー:', error)
    return NextResponse.json(
      { error: 'カートの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// カートに商品追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const { productId, quantity = 1 } = await request.json()
    console.log('🛒 カート追加リクエスト:', { productId, quantity, userId: session.user.id })

    // 商品の存在確認（isActiveフィルターを削除）
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true }
    })

    console.log('🔍 商品検索結果:', { 
      found: !!product, 
      productId,
      hasInventory: !!product?.inventory,
      inventoryQuantity: product?.inventory?.quantity 
    })

    if (!product) {
      console.error('❌ 商品が見つかりません:', productId)
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 在庫確認
    if (!product.inventory || product.inventory.quantity < quantity) {
      return NextResponse.json(
        { error: '在庫が不足しています' },
        { status: 400 }
      )
    }

    // 既存のカートアイテムを確認
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId
        }
      }
    })

    if (existingItem) {
      // 数量を更新
      const newQuantity = existingItem.quantity + quantity
      if (product.inventory.quantity < newQuantity) {
        return NextResponse.json(
          { error: '在庫が不足しています' },
          { status: 400 }
        )
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      })
      console.log('✅ カートアイテム数量更新:', { productId, oldQuantity: existingItem.quantity, newQuantity })
    } else {
      // 新しいカートアイテムを作成
      await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId: productId,
          quantity: quantity
        }
      })
      console.log('✅ 新しいカートアイテム作成:', { productId, quantity })
    }

    console.log('🎉 カート追加処理完了')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Prismaエラーやその他の例外を詳細に出力
    if (error instanceof Error) {
      console.error('カート追加エラー:', error.message)
      if (error.stack) console.error(error.stack)
      if ((error as any).code) console.error('Prismaエラーコード:', (error as any).code)
      if ((error as any).meta) console.error('Prismaエラー詳細:', (error as any).meta)
    } else {
      console.error('カート追加エラー:', error)
    }
    return NextResponse.json(
      { error: 'カートへの追加に失敗しました', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

// カート全体をクリア
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('カートクリアエラー:', error)
    return NextResponse.json(
      { error: 'カートのクリアに失敗しました' },
      { status: 500 }
    )
  }
}