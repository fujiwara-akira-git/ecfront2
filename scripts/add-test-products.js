const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addTestProducts() {
  try {
    console.log('テスト用商品データを追加中...')

    // 関連データを順番に削除（外部キー制約を考慮）
    await prisma.orderItem.deleteMany()
    await prisma.cartItem.deleteMany()
    await prisma.product.deleteMany()

    // テスト用商品を追加
    const products = [
      {
        name: '新鮮な有機トマト',
        description: '農薬を使わずに育てた甘くて美味しいトマトです。サラダやパスタに最適です。',
        price: 300,
        image: 'https://images.unsplash.com/photo-1546470427-e7b5c0e9be43?w=400',
        isActive: true
      },
      {
        name: '朝採れレタス',
        description: 'シャキシャキとした食感が自慢の新鮮なレタスです。サラダの主役にどうぞ。',
        price: 200,
        image: 'https://images.unsplash.com/photo-1556909552-f6b5b9e4b3b3?w=400',
        isActive: true
      },
      {
        name: '甘い人参',
        description: 'βカロテンが豊富で甘みの強い人参です。煮物やサラダに最適です。',
        price: 150,
        image: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400',
        isActive: true
      },
      {
        name: '新玉ねぎ',
        description: '辛味が少なく甘みがある春の新玉ねぎです。生でも美味しくいただけます。',
        price: 180,
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
        isActive: true
      },
      {
        name: '無農薬キュウリ',
        description: '農薬を使わずに育てた安心・安全なキュウリです。みずみずしさが自慢です。',
        price: 120,
        image: 'https://images.unsplash.com/photo-1519477710006-4bb1d19e6bd4?w=400',
        isActive: true
      }
    ]

    for (const product of products) {
      const createdProduct = await prisma.product.create({ data: product })
      
      // 在庫情報も追加
      await prisma.inventory.create({
        data: {
          productId: createdProduct.id,
          quantity: 50, // デフォルト在庫数
          reservedQty: 0,
          minStock: 10
        }
      })
    }

    console.log(`${products.length}個のテスト用商品を追加しました`)

  } catch (error) {
    console.error('商品データ追加エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTestProducts()