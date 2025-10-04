import { prisma } from '../lib/prisma';
(async ()=>{
  try{
    const now = await prisma.$queryRaw`SELECT now()`;
    console.log('OK', now);
    console.log('stripeEvent', await prisma.stripeEvent.count());
    console.log('order', await prisma.order.count());
    console.log('payment', await prisma.payment.count());
    await prisma.$disconnect();
  }catch(e){
    console.error('ERR', e);
    try{ await prisma.$disconnect() }catch(_){}
    process.exit(2);
  }
})();
