const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('シーディング開始...')

  // カテゴリを作成
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: '果物' },
      update: {},
      create: {
        name: '果物',
        description: '新鮮な果物類'
      }
    }),
    prisma.category.upsert({
      where: { name: '野菜' },
      update: {},
      create: {
        name: '野菜',
        description: '栄養豊富な野菜類'
      }
    })
  ])

  // 生産者を作成
  const producers = await Promise.all([
    prisma.producer.upsert({
      where: { name: '山田農園' },
      update: {},
      create: {
        name: '山田農園',
        description: '有機栽培にこだわった農園',
        address: '栃木県宇都宮市',
        email: 'yamada@example.com'
      }
    }),
    prisma.producer.upsert({
      where: { name: '鈴木果樹園' },
      update: {},
      create: {
        name: '鈴木果樹園',
        description: '甘い果物を育てています',
        address: '長野県松本市',
        email: 'suzuki@example.com'
      }
    })
  ])

  // 商品を作成
  const products = []

  const apple = await prisma.product.upsert({
    where: { id: 'apple-001' },
    update: {},
    create: {
      id: 'apple-001',
      name: 'りんご（フジ）',
      description: 'シャキッとした食感の美味しいりんごです',
      price: 200,
      image: '🍎',
      isActive: true,
      categoryId: categories[0].id, // 果物
      producerId: producers[0].id    // 山田農園
    }
  })

  const orange = await prisma.product.upsert({
    where: { id: 'orange-001' },
    update: {},
    create: {
      id: 'orange-001',
      name: 'みかん',
      description: '甘くてジューシーな国産みかんです',
      price: 150,
      image: '🍊',
      isActive: true,
      categoryId: categories[0].id, // 果物
      producerId: producers[1].id    // 鈴木果樹園
    }
  })

  const spinach = await prisma.product.upsert({
    where: { id: 'spinach-001' },
    update: {},
    create: {
      id: 'spinach-001',
      name: 'ほうれん草',
      description: '栄養満点の新鮮なほうれん草です',
      price: 120,
      image: '🥬',
      isActive: true,
      categoryId: categories[1].id, // 野菜
      producerId: producers[0].id    // 山田農園
    }
  })

  products.push(apple, orange, spinach)

  // 在庫を作成
  for (const product of products) {
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 100) + 50, // 50-149個のランダム在庫
        reservedQty: 0,
        minStock: 10,
        maxStock: 200
      }
    })
  }

  console.log(`✅ シーディング完了: ${products.length}個の商品を作成しました`)
  console.log('商品ID:')
  products.forEach(p => console.log(`  - ${p.id}: ${p.name}`))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })