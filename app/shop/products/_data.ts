export type Product = { 
  id: string; 
  name: string; 
  price: number; 
  producerName: string; 
  description?: string; 
  category?: string; 
  image?: string;
  stock?: number;
  isInStock?: boolean;
}

// データベースから商品を取得する関数
import { prisma } from '@/lib/prisma'

export async function getProducts(): Promise<Product[]> {
  try {
    // サーバーサイドでは直接DBへアクセスし、クライアントサイドは相対APIを叩く
    if (typeof window === 'undefined') {
      if (!process.env.DATABASE_URL) {
        console.warn('DATABASE_URL is not set — returning empty product list')
        return []
      }

      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true, producer: true, inventory: true },
        orderBy: { createdAt: 'desc' }
      })

      return products.map((product) => ({
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
    }

    const baseUrl = ''
    const response = await fetch(`${baseUrl}/api/products`, {
      cache: 'no-store' // 常に最新データを取得
    })

    if (!response.ok) {
      throw new Error('商品の取得に失敗しました')
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('商品取得エラー:', error)
    // エラーは上位に投げてハンドリングさせる（フォールバックは削除）
    throw error
  }
}

// 個別商品取得
export async function getProduct(id: string): Promise<Product | null> {
  try {
    // サーバーサイドではDBに直接問い合わせる
    if (typeof window === 'undefined') {
      if (!process.env.DATABASE_URL) return null

      const product = await prisma.product.findUnique({
        where: { id },
        include: { category: true, producer: true, inventory: true }
      })

      if (!product) return null

      return {
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
    }

    const baseUrl = ''
    const response = await fetch(`${baseUrl}/api/products/${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.product || null
  } catch (error) {
    console.error('商品取得エラー:', error)
    throw error
  }
}

// フォールバック静的データは削除しました。常に DB を参照してください。

// 商品カテゴリと名前に基づいて絵文字を返す関数
function getProductEmoji(category: string | undefined, name: string): string {
  if (name.includes('特選野菜セット')) return '🥗'
  if (name.includes('りんご')) return '🍎'
  if (name.includes('みかん')) return '🍊'
  if (name.includes('ほうれん草')) return '🥬'
  if (name.includes('レタス')) return '🥬'
  if (name.includes('トマト')) return '🍅'
  if (name.includes('人参')) return '🥕'
  if (name.includes('きゅうり')) return '🥒'

  switch (category) {
    case '果物': return '🍎'
    case '野菜': return '🥬'
    case 'セット商品': return '🥗'
    default: return '🌟'
  }
}
