const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({ where: { name: { contains: 'hero-special' } } });
  console.log(product ? product : 'Not found');
  await prisma.$disconnect();
}

main();
