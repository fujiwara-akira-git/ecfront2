const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupProducts() {
  try {
    console.log('=== 商品データのクリーンアップ開始 ===');

    // 1. 古い商品データを削除（カテゴリや生産者が未設定のもの）
    console.log('\n1. 古い商品データを削除中...');
    const oldProducts = await prisma.product.findMany({
      where: {
        OR: [
          { categoryId: null },
          { producerId: null },
          { 
            name: {
              in: [
                '新鮮な有機トマト',
                '朝採れレタス', 
                '甘い人参',
                '新玉ねぎ',
                '無農薬キュウリ',
                '朝どり新鮮レタス',
                '完熟トマト',
                '旬のきゅうり',
                '今日の特選野菜セット'
              ]
            }
          }
        ]
      },
      include: { inventory: true }
    });

    console.log(`削除対象: ${oldProducts.length}個の商品`);
    
    for (const product of oldProducts) {
      console.log(`削除: ${product.name} (ID: ${product.id})`);
      // 在庫データも一緒に削除
      if (product.inventory) {
        await prisma.inventory.delete({
          where: { id: product.inventory.id }
        });
      }
      await prisma.product.delete({
        where: { id: product.id }
      });
    }

    // 2. 残った商品を確認
    console.log('\n2. 残った商品を確認中...');
    const remainingProducts = await prisma.product.findMany({
      include: { 
        inventory: true, 
        category: true, 
        producer: true 
      }
    });

    console.log(`\n=== 最終的な商品一覧（${remainingProducts.length}個）===`);
    remainingProducts.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`名前: ${p.name}`);
      console.log(`価格: ¥${p.price}`);
      console.log(`生産者: ${p.producer?.name || '未設定'}`);
      console.log(`カテゴリ: ${p.category?.name || '未設定'}`);
      console.log(`在庫: ${p.inventory?.quantity || 0}個`);
      console.log('---');
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProducts();