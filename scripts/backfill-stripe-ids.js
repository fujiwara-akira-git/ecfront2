#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import yargsPkg from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

dotenv.config({ path: process.cwd() + '/.env.local' });
const prisma = new PrismaClient();
const yargs = yargsPkg;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('apply', { type: 'boolean', default: false, description: 'Apply updates to DB' })
    .help()
    .argv;

  console.log('Starting backfill-stripe-ids.js (Node.js)');

  // Find payments with empty stripeId
  const payments = await prisma.$queryRaw`
    SELECT id, "orderId", amount, status, "createdAt"
    FROM "Payment"
    WHERE "stripeId" IS NULL OR "stripeId" = ''
    ORDER BY "createdAt" ASC
  `;

  if (!payments || payments.length === 0) {
    console.log('No payments without stripeId found.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${payments.length} candidate payments (showing up to 50)`);
  const candidates = payments.slice(0, 50);

  const results = [];
  for (const p of candidates) {
    // fetch recent StripeEvent for this orderId
    const rows = await prisma.$queryRaw`
      SELECT payload::text as payload
      FROM "StripeEvent"
      WHERE payload::text LIKE ${'%' + p.orderId + '%'}
      ORDER BY "createdAt" DESC
      LIMIT 3
    `;

    let sessionId = null;
    for (const r of rows) {
      try {
        const payload = JSON.parse(r.payload);
        const obj = payload && payload.data && payload.data.object;
        if (obj && obj.id && (obj.object === 'checkout.session' || obj.id.startsWith('cs_') || obj.id.startsWith('sess_'))) {
          sessionId = obj.id;
          break;
        }
        // maybe payload is the session itself
        if (payload && payload.id && (payload.id.startsWith('cs_') || payload.id.startsWith('sess_'))) {
          sessionId = payload.id;
          break;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    let resolved = null;
    let stripeSession = null;
    if (sessionId) {
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent', 'payment_intent.charges.data']
        });
      } catch (e) {
        // session might not exist
      }
    }

    // resolve payment id from session
    if (stripeSession) {
      const pi = stripeSession.payment_intent;
      if (pi) {
        if (typeof pi === 'string') resolved = pi;
        else if (pi.id) resolved = pi.id;
        // try latest_charge
        if (!resolved && pi.charges && pi.charges.data && pi.charges.data.length > 0) {
          resolved = pi.charges.data[0].id;
        }
      }
      // fallback to latest_charge on session
      if (!resolved && stripeSession.latest_charge) resolved = stripeSession.latest_charge;
      // fallback to charges field
      if (!resolved && stripeSession.charges && stripeSession.charges.data && stripeSession.charges.data.length > 0) {
        resolved = stripeSession.charges.data[0].id;
      }
    }

    results.push({ paymentId: p.id, orderId: p.orderId, sessionId, resolved, amount: p.amount });
  }

  console.table(results);

  const toApply = results.filter(r => r.resolved);
  console.log(`Can resolve stripe id for ${toApply.length} of ${results.length} candidates.`);

  if (toApply.length > 0 && argv.apply) {
    console.log('Applying updates...');
    for (const r of toApply) {
      try {
        const res = await prisma.$queryRaw`
          UPDATE "Payment" SET "stripeId" = ${r.resolved}
          WHERE id = ${r.paymentId}
          RETURNING id, "stripeId";
        `;
        console.log('Updated', res);
      } catch (e) {
        console.error('Failed updating', r, e);
      }
    }
  } else if (toApply.length > 0) {
    console.log('Run with --apply to update the DB for those candidates.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch (e) {
    console.error('Failed to disconnect prisma', e);
  }
  process.exit(1);
});
