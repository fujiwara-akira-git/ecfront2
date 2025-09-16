const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const projectRoot = path.resolve(__dirname, '..');
try{
  const { PrismaClient } = require(path.join(projectRoot, 'node_modules', '@prisma', 'client'));
  const p = new PrismaClient();
  (async ()=>{
    try{
      const now = await p.$queryRawUnsafe('SELECT now()');
      console.log('OK', now);
      const se = await p.stripeEvent.count().catch(e=>({err:e.message}));
      const o = await p.order.count().catch(e=>({err:e.message}));
      const pay = await p.payment.count().catch(e=>({err:e.message}));
      console.log('stripeEvent', se);
      console.log('order', o);
      console.log('payment', pay);
      await p.$disconnect();
    }catch(e){
      console.error('ERR', e);
      try{ await p.$disconnect() }catch(_){ }
      process.exit(2);
    }
  })();
}catch(e){
  console.error('LOAD ERR', e);
  process.exit(2);
}
