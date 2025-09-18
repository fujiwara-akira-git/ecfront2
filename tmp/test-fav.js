const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
const { prisma } = require('../lib/prisma')

async function main(){
  const userId = 'c98227c1-82df-471d-bb97-fd31d0fd845e'
  // use an existing producer id from local DB
  const producerId = 'a1d1c776-b090-4bbc-8871-e13cb2367ef1'
  try{
    const fav = await prisma.favoriteProducer.upsert({
      where: { userId_producerId: { userId, producerId } },
      update: {},
      create: { userId, producerId }
    })
    console.log('upserted:', fav)
  }catch(e){
    console.error('prisma error', e)
    process.exitCode = 1
  }finally{
    await prisma.$disconnect()
  }
}

main()
