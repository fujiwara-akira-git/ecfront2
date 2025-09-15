const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 必要に応じてcategoryIdやproducerIdを既存のIDに変更してください
  const product = await prisma.product.create({
    data: {
      id: 'f5c61226-f7cc-4b82-860b-baa11d83ad27',
      name: '特選野菜セット',
      description: '旬の野菜を詰め合わせたセット',
      price: 1980,
      image: null,
      categoryId: null,
      producerId: null,
      isActive: true
    }
  });
  console.log('Product created:', product);
  await prisma.$disconnect();
}

main();
