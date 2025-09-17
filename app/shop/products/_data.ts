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
import config from '@/lib/config'

export async function getProducts(): Promise<Product[]> {
  try {
    // サーバーサイドは絶対URL、クライアントサイドは相対URL
    const baseUrl = typeof window === 'undefined'
      ? config.NEXTAUTH_URL || config.getBaseUrl()
      : ''
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
    // サーバーサイドとクライアントサイドの両方に対応
    const baseUrl = typeof window === 'undefined' 
      ? config.NEXTAUTH_URL || config.getBaseUrl()
      : ''
    
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
