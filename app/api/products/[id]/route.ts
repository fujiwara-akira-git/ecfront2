import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const product = await prisma.product.findUnique({
      where: { 
        id,
        isActive: true 
      },
      include: {
        category: true,
        producer: true,
        inventory: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    const formattedProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      producerName: product.producer?.name || '不明',
      description: product.description || '',
      category: product.category?.name || '未分類',
      image: getProductEmoji(product.category?.name, product.name),
      stock: product.inventory?.quantity || 0,
      isInStock: (product.inventory?.quantity || 0) > 0
    }

    return NextResponse.json({ product: formattedProduct })
  } catch (error) {
    console.error('商品取得エラー:', error)
    return NextResponse.json(
      { error: '商品の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 商品カテゴリと名前に基づいて絵文字を返す関数
function getProductEmoji(category: string | undefined, name: string): string {
  // 特定商品の絵文字
  if (name.includes('特選野菜セット')) return '🥗'
  if (name.includes('りんご')) return '🍎'
  if (name.includes('みかん')) return '🍊'
  if (name.includes('ほうれん草')) return '🥬'
  if (name.includes('レタス')) return '🥬'
  if (name.includes('トマト')) return '🍅'
  if (name.includes('人参')) return '🥕'
  if (name.includes('きゅうり')) return '🥒'
  
  // カテゴリ別のデフォルト絵文字
  switch (category) {
    case '果物': return '🍎'
    case '野菜': return '🥬'
    case 'セット商品': return '🥗'
    default: return '🌟'
  }
}