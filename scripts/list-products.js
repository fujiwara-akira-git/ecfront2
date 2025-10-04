const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  products.forEach(p => console.log(p.id, p.name));
  await prisma.$disconnect();
}

main();
