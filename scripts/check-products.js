const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('=== データベース内の商品一覧 ===');
    const products = await prisma.product.findMany({
      include: { inventory: true, category: true, producer: true }
    });

    products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`名前: ${p.name}`);
      console.log(`価格: ¥${p.price}`);
      console.log(`生産者: ${p.producer?.name || '未設定'}`);
      console.log(`カテゴリ: ${p.category?.name || '未設定'}`);
      console.log(`在庫: ${p.inventory?.quantity || 0}個`);
      console.log(`アクティブ: ${p.isActive}`);
      console.log('---');
    });

    console.log('\n=== 「朝採れ」または「朝どり」を含む商品検索 ===');
    const morningProducts = products.filter(p => 
      p.name.includes('朝採れ') || 
      p.name.includes('朝どり') || 
      p.description?.includes('朝採れ') || 
      p.description?.includes('朝どり')
    );

    if (morningProducts.length > 0) {
      morningProducts.forEach(p => {
        console.log(`見つかった商品: ${p.name} (ID: ${p.id})`);
      });
    } else {
      console.log('朝採れ・朝どり系の商品は見つかりませんでした');
    }

    console.log(`\n=== 総商品数: ${products.length}個 ===`);
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();