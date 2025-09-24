const fs = require('fs');
const path = require('path');
const infile = path.join(process.cwd(), 'tmp', 'stripe-sessions.jsonl');
const outJsonl = path.join(process.cwd(), 'tmp', 'stripe-sessions-summary.jsonl');
const outCsv = path.join(process.cwd(), 'tmp', 'stripe-sessions-summary.csv');

if (!fs.existsSync(infile)) {
  console.error('input not found:', infile);
  process.exit(2);
}
const raw = fs.readFileSync(infile, 'utf8');
// split by top-level object boundary heuristic
const parts = raw.split(/\n}\n(?=\{)/g).map((p, idx, arr) => {
  let s = p;
  if (!s.trim().startsWith('{')) s = '{' + s;
  if (!s.trim().endsWith('}')) s = s + '\n}';
  return s;
});

const outLines = [];
const csvLines = ['sessionId,payment_intent_id,payment_status,metadata_orderId,metadata_userId,created'];
for (const p of parts) {
  try {
    const obj = JSON.parse(p);
    const sessionId = obj.id || '';
    const paymentIntent = (obj.payment_intent && (typeof obj.payment_intent === 'object')) ? (obj.payment_intent.id || '') : (typeof obj.payment_intent === 'string' ? obj.payment_intent : '');
    const payment_status = obj.payment_status || '';
    const metadata = obj.metadata || {};
    const orderId = metadata.orderId || metadata.orderid || '';
    const userId = metadata.userId || metadata.userid || '';
    const created = obj.created || '';
    const summary = { sessionId, paymentIntent, payment_status, orderId, userId, created };
    outLines.push(JSON.stringify(summary));
    csvLines.push([sessionId, paymentIntent, payment_status, (orderId||''), (userId||''), created].map(s=> '"'+String(s).replace(/"/g,'""')+'"').join(','));
  } catch (e) {
    // skip unparsable
    console.warn('parse error for chunk (skipping):', e && e.message ? e.message : e);
  }
}
fs.writeFileSync(outJsonl, outLines.join('\n') + '\n');
fs.writeFileSync(outCsv, csvLines.join('\n') + '\n');
console.log('wrote', outJsonl, 'and', outCsv);
