const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
let env = '';
try { env = fs.readFileSync(envPath, 'utf8'); } catch (e) { console.error('Could not read .env.local', e); process.exit(2); }
const match = env.match(/^STRIPE_SECRET_KEY=(?:"?)(.*?)(?:"?)$/m);
if (!match) { console.error('STRIPE_SECRET_KEY not found in .env.local'); process.exit(2); }
const stripeSecret = match[1].replace(/\n/g,'').trim();
if (!stripeSecret) { console.error('STRIPE_SECRET_KEY empty after trim'); process.exit(2); }
const sessionId = process.argv[2];
if (!sessionId) { console.error('Usage: node check-stripe-session.js <SESSION_ID>'); process.exit(2); }
(async ()=>{
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecret);
    const r = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent','line_items','customer'] });
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('ERROR:', e && e.message ? e.message : String(e));
    process.exit(2);
  }
})();
