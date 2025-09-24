const fs = require('fs');
const path = require('path');
const root = process.cwd();
const summaryFile = path.join(root, 'tmp', 'stripe-sessions-summary.jsonl');
const outFile = path.join(root, 'tmp', 'stripe-db-checks.jsonl');

if (!fs.existsSync(summaryFile)) {
  console.error('summary file not found:', summaryFile);
  process.exit(2);
}

const lines = fs.readFileSync(summaryFile, 'utf8').split(/\n/).filter(Boolean);

// Import prisma client from generated @prisma/client
let prisma
try {
  const { PrismaClient } = require('@prisma/client')
  prisma = new PrismaClient()
} catch (e) {
  console.error('could not initialize Prisma client via @prisma/client:', e && e.message ? e.message : e)
  process.exit(3)
}

async function main() {
  const out = [];
  for (const l of lines) {
    const obj = JSON.parse(l);
    const sessionId = obj.sessionId;
    const paymentIntent = obj.paymentIntent || '';
    const orderId = obj.orderId || '';
    const userId = obj.userId || '';
    const result = { sessionId, paymentIntent, orderId, userId, checks: {} };

    // Check stripeEvent
    try {
      const se = await prisma.stripeEvent.findUnique({ where: { id: sessionId } });
      result.checks.stripeEvent = se ? { present: true, processed: se.processed, processedAt: se.processedAt } : { present: false };
    } catch (e) {
      result.checks.stripeEvent = { error: String(e && e.message ? e.message : e) };
    }

    // Check order by metadata.orderId
    if (orderId) {
      try {
        const ord = await prisma.order.findUnique({ where: { id: orderId } });
        result.checks.order = ord ? { present: true, status: ord.status, totalAmount: ord.totalAmount, id: ord.id } : { present: false };
      } catch (e) {
        result.checks.order = { error: String(e && e.message ? e.message : e) };
      }
    } else {
      result.checks.order = { present: false, note: 'no orderId in session metadata' };
    }

    // Check payment by paymentIntent
    if (paymentIntent) {
      try {
        const pay = await prisma.payment.findFirst({ where: { stripeId: paymentIntent } });
        result.checks.payment = pay ? { present: true, id: pay.id, orderId: pay.orderId, stripeId: pay.stripeId, amount: pay.amount } : { present: false };
      } catch (e) {
        result.checks.payment = { error: String(e && e.message ? e.message : e) };
      }
    } else {
      result.checks.payment = { present: false, note: 'no paymentIntent in session' };
    }

    // Check orderItems existence if order present
    if (result.checks.order && result.checks.order.present) {
      try {
        const items = await prisma.orderItem.findMany({ where: { orderId: result.checks.order.id } });
        result.checks.orderItems = { present: (items && items.length>0), count: items ? items.length : 0 };
      } catch (e) {
        result.checks.orderItems = { error: String(e && e.message ? e.message : e) };
      }
    }

    out.push(result);
  }
  fs.writeFileSync(outFile, out.map(JSON.stringify).join('\n') + '\n');
  console.log('wrote', outFile);
}

main().catch(e=>{console.error(e); process.exit(3)});
