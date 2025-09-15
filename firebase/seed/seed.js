/**
 * Simple Firestore seeder for local emulator.
 * Run: FIRESTORE_EMULATOR_HOST=localhost:8080 node firebase/seed/seed.js
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Please set FIRESTORE_EMULATOR_HOST=localhost:8080 when running the seed against emulator')
  process.exit(1)
}

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

async function seed() {
  console.log('Seeding Firestore (emulator) ...')

  // Products
  const products = [
    { id: 'p1', name: 'りんご', price: 200, producerName: '山田農園', category: '果物', description: 'シャキッとしたりんご' },
    { id: 'p2', name: 'みかん', price: 150, producerName: '鈴木果樹園', category: '果物', description: '甘いみかん' },
    { id: 'p3', name: 'ほうれん草', price: 120, producerName: '佐藤農場', category: '野菜', description: '新鮮な葉物' }
  ]

  for (const p of products) {
    await db.collection('products').doc(p.id).set(p)
  }

  // Inventory (stock per product per location)
  const inventory = [
    { id: 'inv1', productId: 'p1', locationId: 'shop1', quantity: 120 },
    { id: 'inv2', productId: 'p2', locationId: 'shop1', quantity: 80 },
    { id: 'inv3', productId: 'p3', locationId: 'shop2', quantity: 200 }
  ]
  for (const i of inventory) await db.collection('inventory').doc(i.id).set(i)

  // Customers
  const customers = [
    { id: 'c1', name: '田中太郎', email: 'taro@example.com', phone: '090-0000-0000' },
    { id: 'c2', name: '山本花子', email: 'hanako@example.com', phone: '080-1111-1111' }
  ]
  for (const c of customers) await db.collection('customers').doc(c.id).set(c)

  // Purchases / Orders
  const purchases = [
    { id: 'o1', customerId: 'c1', items: [{ productId: 'p1', qty: 2 }], total: 400, status: 'paid', createdAt: new Date().toISOString() }
  ]
  for (const o of purchases) await db.collection('purchases').doc(o.id).set(o)

  // Transactions (accounting events)
  const transactions = [
    { id: 't1', purchaseId: 'o1', type: 'sale', amount: 400, createdAt: new Date().toISOString() }
  ]
  for (const t of transactions) await db.collection('transactions').doc(t.id).set(t)

  // Admin users
  const admins = [
    { id: 'admin1', email: 'admin@example.com', name: '管理者', roles: ['admin'] }
  ]
  for (const a of admins) await db.collection('adminUsers').doc(a.id).set(a)

  // Partners (freee 取引先 や 取引先マスタ)
  const partners = [
    { id: 'pt1', name: '山田農園', contact: 'yamada@example.com' }
  ]
  for (const p of partners) await db.collection('partners').doc(p.id).set(p)

  // Stock entries (入庫)
  const stockEntries = [
    { id: 'se1', productId: 'p1', locationId: 'shop1', qty: 100, type: 'inbound', createdAt: new Date().toISOString() }
  ]
  for (const s of stockEntries) await db.collection('stockEntries').doc(s.id).set(s)

  console.log('Seeding complete')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
