import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// フォールバック用の簡易商品データ（DB 未設定時の開発用）
const fallbackProducts = [
  {
    id: 'hero-special',
    name: '今日の特選野菜セット',
    price: 1980,
    producerName: 'Eagle Palace農園',
    description:
      '朝採れ新鮮野菜の特別セット。季節の野菜を厳選してお届けします。',
    category: 'セット商品',
    image: '🥗',
    stock: 15,
    isInStock: true
  }
]

export async function GET() {
  // 開発環境で DATABASE_URL が未設定の場合、500 を返さずフォールバックを返す
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set — returning fallback products')
    return NextResponse.json({ products: fallbackProducts })
  }

  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        producer: true,
        inventory: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      producerName: product.producer?.name || '不明',
      description: product.description || '',
      category: product.category?.name || '未分類',
      image: getProductEmoji(product.category?.name, product.name),
      stock: product.inventory?.quantity || 0,
      isInStock: (product.inventory?.quantity || 0) > 0
    }))

    return NextResponse.json({ products: formattedProducts })
  } catch (error: any) {
    // Prisma の初期化エラー（DATABASE_URL 未設定など）の場合はフォールバック
    const msg = error?.message || ''
    console.error('商品取得エラー:', error)
    if (msg.includes('Environment variable not found: DATABASE_URL') || error?.name === 'PrismaClientInitializationError') {
      return NextResponse.json({ products: fallbackProducts })
    }

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