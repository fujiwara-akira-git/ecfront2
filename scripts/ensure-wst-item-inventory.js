const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({ where: { name: 'W-ST Item' } });
  if (!product) {
    console.log('商品が見つかりません');
    process.exit(1);
  }
  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: { quantity: 100 },
    create: { productId: product.id, quantity: 100, reservedQty: 0, minStock: 0, maxStock: null }
  });
  console.log('在庫確保:', product.name, product.id);
  await prisma.$disconnect();
}

main();
