#!/usr/bin/env node
/**
 * Safe fixer for product.image field.
 * Usage: export DATABASE_URL=...; node tmp/fix-product-image.js <productId>
 * The script logs the current value and then sets `image` to null.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const [, , productId] = process.argv;
  if (!productId) {
    console.error('Usage: node tmp/fix-product-image.js <productId>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set in the environment. Export it first.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const before = await prisma.product.findUnique({ where: { id: productId } });
    if (!before) {
      console.error('No product found with id', productId);
      process.exit(1);
    }

    console.log('Before:', { id: before.id, image: before.image });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { image: null },
    });

    console.log('After:', { id: updated.id, image: updated.image });
  } catch (err) {
    console.error('Error during DB operation:', err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
