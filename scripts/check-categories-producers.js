const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCategoriesAndProducers() {
  try {
    console.log('=== カテゴリ一覧 ===')
    const categories = await prisma.category.findMany()
    categories.forEach(c => console.log(`- ${c.id}: ${c.name}`))
    
    console.log('\n=== プロデューサー一覧 ===')
    const producers = await prisma.producer.findMany()
    producers.forEach(p => console.log(`- ${p.id}: ${p.name}`))
    
    console.log('\n=== 既存商品の詳細 ===')
    const products = await prisma.product.findMany({
      include: {
        category: true,
        producer: true,
        inventory: true
      }
    })
    
    products.forEach(p => {
      console.log(`${p.id}: ${p.name}`)
      console.log(`  Category: ${p.category?.name || 'なし'}`)
      console.log(`  Producer: ${p.producer?.name || 'なし'}`)
      console.log(`  在庫: ${p.inventory?.quantity || 0}`)
    })
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCategoriesAndProducers()