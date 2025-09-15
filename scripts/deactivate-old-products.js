const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deactivateOldProducts() {
  try {
    console.log('=== 古い商品データを非アクティブ化 ===');

    // 古い商品を非アクティブ化（削除できない場合）
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
      }
    });

    console.log(`非アクティブ化対象: ${oldProducts.length}個の商品`);
    
    for (const product of oldProducts) {
      console.log(`非アクティブ化: ${product.name} (ID: ${product.id})`);
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false }
      });
    }

    // アクティブな商品のみを表示
    console.log('\n=== アクティブな商品一覧 ===');
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: { 
        inventory: true, 
        category: true, 
        producer: true 
      }
    });

    console.log(`アクティブな商品: ${activeProducts.length}個`);
    activeProducts.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`名前: ${p.name}`);
      console.log(`価格: ¥${p.price}`);
      console.log(`生産者: ${p.producer?.name || '未設定'}`);
      console.log(`カテゴリ: ${p.category?.name || '未設定'}`);
      console.log(`在庫: ${p.inventory?.quantity || 0}個`);
      console.log('---');
    });

    // 「朝採れ」「朝どり」系の商品確認
    console.log('\n=== 朝採れ・朝どり系商品（アクティブのみ）===');
    const morningProducts = activeProducts.filter(p => 
      p.name.includes('朝採れ') || 
      p.name.includes('朝どり') || 
      p.description?.includes('朝採れ') || 
      p.description?.includes('朝どり')
    );

    if (morningProducts.length > 0) {
      morningProducts.forEach(p => {
        console.log(`${p.name} (ID: ${p.id})`);
      });
    } else {
      console.log('アクティブな朝採れ・朝どり系商品はありません');
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deactivateOldProducts();