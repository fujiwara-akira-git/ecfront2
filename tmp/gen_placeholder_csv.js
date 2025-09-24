const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

(async () => {
  try {
    console.log('cwd', process.cwd());
    const out = path.join(process.cwd(), 'tmp', 'placeholder_mappings.csv');
    console.log('out', out);
    const prisma = new PrismaClient();
    const placeholders = await prisma.product.findMany({ where: { description: { contains: 'imported_from_stripe' } }, orderBy: { createdAt: 'asc' } });
    const products = await prisma.product.findMany({ where: { NOT: { description: { contains: 'imported_from_stripe' } } } });
    console.log('placeholders', placeholders.length, 'products', products.length);
    function simpleScore(a, b) { if (!a || !b) return 0; a = a.toLowerCase(); b = b.toLowerCase(); const aWords = a.split(/\s+/); const bWords = b.split(/\s+/); const common = aWords.filter(w => bWords.includes(w)).length; const lenDiff = Math.abs(a.length - b.length); return common * 10 - lenDiff }
    const rows = [];
    for (const ph of placeholders) {
      const candidates = products.map(p => ({ id: p.id, name: p.name, price: p.price, score: simpleScore(ph.name, p.name) + (ph.price === p.price ? 20 : 0) }));
      candidates.sort((a, b) => b.score - a.score);
      const top = candidates[0];
      rows.push({ placeholderId: ph.id, placeholderName: ph.name, placeholderPrice: ph.price, targetId: top ? top.id : null, targetName: top ? top.name : null, targetPrice: top ? top.price : null, confidence: top ? top.score : null })
    }
    const csv = ['placeholderId,placeholderName,placeholderPrice,targetId,targetName,targetPrice,confidence', ...rows.map(r => `${r.placeholderId},"${r.placeholderName.replace(/"/g, '""')}",${r.placeholderPrice},${r.targetId || ''},"${(r.targetName || '').replace(/"/g, '""')}",${r.targetPrice || ''},${r.confidence || ''}`)].join('\n');
    fs.writeFileSync(out, csv);
    console.log('wrote', out, 'rows', rows.length);
    console.log('---CSV START---');
    console.log(csv);
    console.log('---CSV END---');
    await prisma.$disconnect();
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
