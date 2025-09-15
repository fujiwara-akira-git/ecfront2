import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/options'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const { localCartItems } = await request.json()
    console.log('🚚 カート移行開始:', {
      userId: session.user.id,
      localItemsCount: localCartItems?.length || 0
    })

    if (!Array.isArray(localCartItems) || localCartItems.length === 0) {
      console.log('🚚 移行するローカルアイテムがありません - データベースから既存カート読み込み')
      return NextResponse.json({ success: true, message: '移行するアイテムがありません' })
    }

    // ローカルカートを優先: まず既存のカートをクリア
    console.log('🚚 既存のカートをクリア（ローカルカート優先）')
    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id }
    })

    let migratedCount = 0
    const failedItems: string[] = []

  // トランザクションで実行
  await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      for (const item of localCartItems) {
        try {
          const { id: productId, quantity } = item
          console.log('🔄 商品移行処理:', { productId, quantity })

          // 商品の存在と在庫確認
          const product = await tx.product.findUnique({
            where: { id: productId },
            include: { inventory: true }
          })

          if (!product) {
            console.warn('❌ 商品が存在しません:', { productId })
            failedItems.push(`${item.name || productId}: 商品が見つかりません（商品が削除された可能性があります）`)
            continue
          }

          if (!product.inventory || product.inventory.quantity < quantity) {
            console.warn('❌ 在庫不足:', { productId, available: product.inventory?.quantity || 0, requested: quantity })
            failedItems.push(`${product.name}: 在庫不足（利用可能: ${product.inventory?.quantity || 0}個）`)
            continue
          }

          // 新しいカートアイテムを作成（既存アイテムは既にクリア済み）
          await tx.cartItem.create({
            data: {
              userId: session.user.id as string,
              productId: productId,
              quantity: quantity
            }
          })
          
          migratedCount++
          console.log('✅ 商品移行成功:', { productId, quantity })
        } catch (itemError) {
          console.error('❌ 個別商品移行エラー:', { productId: item.id, error: itemError })
          failedItems.push(`${item.name}: 移行エラー`)
        }
      }
    })

    console.log('🚚 カート移行完了:', { 
      total: localCartItems.length, 
      migrated: migratedCount, 
      failed: failedItems.length 
    })

    const message = failedItems.length > 0 
      ? `カート移行が完了しました。${migratedCount}個の商品が移行され、${failedItems.length}個の商品で問題が発生しました。`
      : `ローカルカートをデータベースに移行しました（${migratedCount}個の商品）`

    return NextResponse.json({ 
      success: true, 
      message,
      migrated: migratedCount,
      total: localCartItems.length,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
      hasFailures: failedItems.length > 0
    })
  } catch (error) {
    console.error('🚚 カート移行エラー:', error)
    return NextResponse.json(
      { error: 'カートの移行に失敗しました' },
      { status: 500 }
    )
  }
}