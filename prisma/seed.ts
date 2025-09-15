import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始: データベースにテストデータをシード')

  // カテゴリの作成
  const categories = [
    { name: '野菜', description: '新鮮な野菜類' },
    { name: 'セット商品', description: '野菜セットや詰め合わせ商品' },
    { name: '果物', description: '季節の果物' },
  ]

  const createdCategories: any[] = []
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    })
    createdCategories.push(created)
    console.log(`📁 カテゴリ作成: ${created.name}`)
  }

  // 生産者の作成
  const producers = [
    { 
      name: '田中農園', 
      description: '有機野菜栽培のパイオニア',
      address: '埼玉県川田谷123-4',
      phone: '048-123-0001',
      email: 'tanaka@farm.com'
    },
    { 
      name: '鈴木農場', 
      description: 'トマト専門農場',
      address: '埼玉県川田谷234-5',
      phone: '048-123-0002',
      email: 'suzuki@farm.com'
    },
    { 
      name: '佐藤ファーム', 
      description: '根菜類専門',
      address: '埼玉県川田谷345-6',
      phone: '048-123-0003',
      email: 'sato@farm.com'
    },
    { 
      name: '山田野菜園', 
      description: '多品種栽培農園',
      address: '埼玉県川田谷456-7',
      phone: '048-123-0004',
      email: 'yamada@farm.com'
    },
    { 
      name: 'Eagle Palace農園', 
      description: '農園直営店',
      address: '埼玉県川田谷1234-5',
      phone: '048-123-4567',
      email: 'info@eaglepalace.com'
    },
  ]

  const createdProducers: any[] = []
  for (const producer of producers) {
    const created = await prisma.producer.upsert({
      where: { name: producer.name },
      update: producer,
      create: producer,
    })
    createdProducers.push(created)
    console.log(`👨‍🌾 生産者作成: ${created.name}`)
  }

  // 商品の作成
  const vegetableCategory = createdCategories.find(c => c.name === '野菜')!
  const setCategory = createdCategories.find(c => c.name === 'セット商品')!

  const products = [
    {
      name: '朝どり新鮮レタス',
      description: '朝採れの新鮮なレタス。シャキシャキの食感と甘みが特徴です。',
      price: 280,
      image: '🥬',
      categoryId: vegetableCategory.id,
      producerId: createdProducers.find(p => p.name === '田中農園')!.id,
      inventory: { quantity: 50, minStock: 10, maxStock: 100 }
    },
    {
      name: '完熟トマト',
      description: '完熟した甘いトマト。栄養価が高く、料理にも最適です。',
      price: 450,
      image: '🍅',
      categoryId: vegetableCategory.id,
      producerId: createdProducers.find(p => p.name === '鈴木農場')!.id,
      inventory: { quantity: 30, minStock: 5, maxStock: 80 }
    },
    {
      name: '甘い人参',
      description: '甘くて栄養たっぷりの人参。βカロテンが豊富で健康に良いです。',
      price: 320,
      image: '🥕',
      categoryId: vegetableCategory.id,
      producerId: createdProducers.find(p => p.name === '佐藤ファーム')!.id,
      inventory: { quantity: 40, minStock: 8, maxStock: 90 }
    },
    {
      name: '旬のきゅうり',
      description: 'シャキシャキの新鮮きゅうり。みずみずしくてさっぱりとした味わいです。',
      price: 200,
      image: '🥒',
      categoryId: vegetableCategory.id,
      producerId: createdProducers.find(p => p.name === '山田野菜園')!.id,
      inventory: { quantity: 60, minStock: 15, maxStock: 120 }
    },
    {
      name: '今日の特選野菜セット',
      description: '朝採れ新鮮野菜の詰め合わせ。季節の旬な野菜を厳選してお届けします。',
      price: 1200,
      image: '🥕🥬🍅',
      categoryId: setCategory.id,
      producerId: createdProducers.find(p => p.name === 'Eagle Palace農園')!.id,
      inventory: { quantity: 20, minStock: 3, maxStock: 50 }
    }
  ]

  const createdProducts: any[] = []
  for (const productData of products) {
    const { inventory, ...product } = productData
    
    const created = await prisma.product.create({
      data: {
        ...product,
        inventory: {
          create: inventory
        }
      },
      include: {
        category: true,
        producer: true,
        inventory: true
      }
    })
    createdProducts.push(created)
    console.log(`🥬 商品作成: ${created.name} (在庫: ${created.inventory?.quantity}個)`)
  }

  // テストユーザーの作成
  const testUsers = [
    {
      email: process.env.TEST_CUSTOMER_EMAIL || 'customer@example.com',
      password: await bcryptjs.hash(process.env.TEST_CUSTOMER_PASSWORD || 'defaultpassword', 10),
      name: 'テスト顧客',
      phone: '090-1234-5678',
      address: '東京都渋谷区1-1-1',
      userType: 'customer'
    },
    {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: await bcryptjs.hash(process.env.TEST_ADMIN_PASSWORD || 'defaultpassword', 10),
      name: '管理者',
      phone: '090-9876-5432',
      address: '埼玉県川田谷1234-5',
      userType: 'admin'
    }
  ]

  const createdUsers: any[] = []
  for (const userData of testUsers) {
    const created = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    })
    createdUsers.push(created)
    console.log(`👤 ユーザー作成: ${created.name} (${created.email})`)
  }

  // サンプル注文の作成
  const testCustomer = createdUsers.find(u => u.userType === 'customer')!
  const lettuce = createdProducts.find(p => p.name === '朝どり新鮮レタス')!
  const tomato = createdProducts.find(p => p.name === '完熟トマト')!

  const sampleOrder = await prisma.order.create({
    data: {
      userId: testCustomer.id,
      customerName: testCustomer.name!,
      customerEmail: testCustomer.email!,
      customerPhone: testCustomer.phone!,
      shippingAddress: testCustomer.address!,
      status: 'delivered',
      subtotal: 1010,
      shippingFee: 600,
      totalAmount: 1610,
      shippingMethod: 'yamato-standard',
      trackingNumber: 'TEST123456789',
      orderItems: {
        create: [
          {
            productId: lettuce.id,
            quantity: 2,
            unitPrice: lettuce.price,
            totalPrice: lettuce.price * 2
          },
          {
            productId: tomato.id,
            quantity: 1,
            unitPrice: tomato.price,
            totalPrice: tomato.price * 1
          }
        ]
      },
      payments: {
        create: {
          amount: 1610,
          currency: 'jpy',
          status: 'succeeded',
          paymentMethod: 'card',
          stripeId: 'pi_test_123456789'
        }
      }
    },
    include: {
      orderItems: {
        include: {
          product: true
        }
      },
      payments: true
    }
  })

  console.log(`🛒 サンプル注文作成: ${sampleOrder.id} (¥${sampleOrder.totalAmount})`)

  // 在庫を注文分減らす
  await prisma.inventory.update({
    where: { productId: lettuce.id },
    data: { quantity: { decrement: 2 } }
  })
  
  await prisma.inventory.update({
    where: { productId: tomato.id },
    data: { quantity: { decrement: 1 } }
  })

  console.log('✅ シード完了: すべてのテストデータが作成されました')
  
  // 作成されたデータの概要を表示
  const summary = {
    categories: await prisma.category.count(),
    producers: await prisma.producer.count(),
    products: await prisma.product.count(),
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
  }
  
  console.log('📊 データベース概要:', summary)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ シードエラー:', e)
    await prisma.$disconnect()
    process.exit(1)
  })