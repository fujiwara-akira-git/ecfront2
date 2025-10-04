const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addSpecialVegetableSet() {
  try {
    console.log('現在の商品一覧を確認中...')
    
    const existingProducts = await prisma.product.findMany({
      include: { inventory: true }
    })
    
    console.log('現在の商品:')
    existingProducts.forEach(p => console.log(`- ${p.id}: ${p.name} (¥${p.price})`))
    
    // 特選野菜セットを追加
    console.log('\n特選野菜セットを追加中...')
    
    const newProduct = await prisma.product.create({
      data: {
        id: 'hero-special',
        name: '今日の特選野菜セット',
        description: '朝採れ新鮮野菜の特別セット。季節の野菜を厳選してお届けします。',
        price: 1980,
        category: 'vegetables',
        producer: 'Eagle Palace Farm',
        origin: '千葉県',
        harvestDate: new Date(),
        unit: 'セット',
        isActive: true,
        inventory: {
          create: {
            quantity: 20,
            reservedQuantity: 0
          }
        }
      },
      include: { inventory: true }
    })
    
    console.log('✅ 特選野菜セットを追加しました:', {
      id: newProduct.id,
      name: newProduct.name,
      price: newProduct.price,
      inventory: newProduct.inventory?.quantity
    })
    
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSpecialVegetableSet()