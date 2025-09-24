const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const qtyArg = args.find(a => a.startsWith('--qty='));
  const qty = qtyArg ? parseInt(qtyArg.split('=')[1], 10) : parseInt(process.env.DEFAULT_INVENTORY_QTY || '100', 10);
  const setAll = args.includes('--set-all');

  console.log('[ensure-inventory] starting', { dryRun, qty, setAll });

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  console.log('[ensure-inventory] total products:', products.length);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    if (!inv) {
      if (dryRun) {
        console.log(`[dry-run] would create inventory for ${product.name} (${product.id}) qty=${qty}`);
      } else {
        await prisma.inventory.create({ data: { productId: product.id, quantity: qty, reservedQty: 0, minStock: 0, maxStock: null } });
        console.log(`created inventory for ${product.name} (${product.id}) qty=${qty}`);
      }
      created++;
      continue;
    }

    // existing inventory
    if (setAll) {
      if (dryRun) {
        console.log(`[dry-run] would set inventory for ${product.name} (${product.id}) from ${inv.quantity} -> ${qty}`);
      } else {
        await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: qty } });
        console.log(`set inventory for ${product.name} (${product.id}) from ${inv.quantity} -> ${qty}`);
      }
      updated++;
      continue;
    }

    if (inv.quantity < qty) {
      if (dryRun) {
        console.log(`[dry-run] would increase inventory for ${product.name} (${product.id}) from ${inv.quantity} -> ${qty}`);
      } else {
        await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: qty } });
        console.log(`increased inventory for ${product.name} (${product.id}) from ${inv.quantity} -> ${qty}`);
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('[ensure-inventory] summary', { total: products.length, created, updated, skipped });
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
