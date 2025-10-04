const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { id: 'f5c61226-f7cc-4b82-860b-baa11d83ad27' }
  });
  console.log(product ? product : 'Not found');
  await prisma.$disconnect();
}

main();
