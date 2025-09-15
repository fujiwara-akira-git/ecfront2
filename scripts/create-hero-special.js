const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createHeroSpecialProduct() {
  try {
    console.log('既存の特選野菜セットを確認中...')
    
    // 既存の特選野菜セットを削除（存在する場合）
    const existingProduct = await prisma.product.findFirst({
      where: { 
        OR: [
          { id: 'hero-special' },
          { name: '今日の特選野菜セット' }
        ]
      },
      include: { inventory: true }
    })
    
    if (existingProduct) {
      console.log(`既存商品を削除中: ${existingProduct.id} - ${existingProduct.name}`)
      
      // インベントリも削除
      if (existingProduct.inventory) {
        await prisma.inventory.delete({
          where: { id: existingProduct.inventory.id }
        })
      }
      
      await prisma.product.delete({
        where: { id: existingProduct.id }
      })
      console.log('✅ 既存商品を削除しました')
    }
    
    // カテゴリとプロデューサーのIDを取得
    const setCategory = await prisma.category.findFirst({
      where: { name: 'セット商品' }
    })
    
    const eagleProducer = await prisma.producer.findFirst({
      where: { name: 'Eagle Palace農園' }
    })
    
    console.log('新しい特選野菜セットを作成中...')
    
    // 新しい特選野菜セットを作成
    const newProduct = await prisma.product.create({
      data: {
        id: 'hero-special',
        name: '今日の特選野菜セット',
        description: '朝採れ新鮮野菜の特別セット。季節の野菜を厳選してお届けします。旬の野菜3-5種類が入ったお得なセットです。',
        price: 1980,
        categoryId: setCategory?.id,
        producerId: eagleProducer?.id,
        isActive: true,
        inventory: {
          create: {
            quantity: 15,
            reservedQty: 0,
            minStock: 3
          }
        }
      },
      include: {
        category: true,
        producer: true,
        inventory: true
      }
    })
    
    console.log('✅ 新しい特選野菜セットを作成しました:')
    console.log({
      id: newProduct.id,
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category?.name,
      producer: newProduct.producer?.name,
      inventory: newProduct.inventory?.quantity
    })
    
    // 商品一覧を確認
    console.log('\n=== アクティブな商品一覧 ===')
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        producer: true,
        inventory: true
      }
    })
    
    activeProducts.forEach(p => {
      console.log(`${p.id}: ${p.name} (¥${p.price}) - 在庫: ${p.inventory?.quantity || 0}個`)
    })
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createHeroSpecialProduct()