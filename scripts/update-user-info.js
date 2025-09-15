const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateUser() {
  try {
    // 現在のユーザーを更新（テスト用データを追加）
    const updatedUser = await prisma.user.update({
      where: { id: 'b2027168-3e6e-4fe6-a630-b1a81b35c68f' },
      data: {
        phone: '090-1234-5678',
        address: '東京都新宿区新宿1-1-1 新宿マンション101号室'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true
      }
    })
    
    console.log('ユーザー情報を更新しました:', updatedUser)
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUser()