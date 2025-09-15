const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  for (const product of products) {
    // 既存のInventoryがなければ新規作成
    const inventory = await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity: 100 }, // 既存なら在庫を100に
      create: {
        productId: product.id,
        quantity: 100,
        reservedQty: 0,
        minStock: 0,
        maxStock: null
      }
    });
    console.log(`在庫確保: ${product.name} (${product.id}) → ${inventory.quantity}`);
  }
  await prisma.$disconnect();
}

main();
