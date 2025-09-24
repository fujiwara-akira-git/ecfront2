const fs = require('fs');
const path = require('path');
const logsPath = path.resolve(__dirname, 'stripe-webhook-logs.jsonl');
const sessionsPath = path.resolve(__dirname, 'stripe-sessions-summary.jsonl');
const outPath = path.resolve(__dirname, 'stripe-webhook-matches.jsonl');

const logs = fs.readFileSync(logsPath, 'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const sessions = fs.readFileSync(sessionsPath, 'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const sessionIds = new Set(sessions.map(s=>s.sessionId));

const matches = [];
for (const entry of logs) {
  try {
    const type = entry.body && (entry.body.type || entry.body?.type);
    const eventType = entry.body && entry.body.type ? entry.body.type : entry.body?.type || entry.body?.id && entry.body?.type;
    const dataObj = entry.body && (entry.body.data ? entry.body.data.object : null) || (entry.body && entry.body.data && entry.body.data.object) || (entry.body && entry.body.data && entry.body.data.object) || null;
    // normalize
    let event = entry.body;
    if (event && event.data && event.data.object) {
      // ok
    } else if (entry.body && entry.body.type && entry.body.data && entry.body.data.object) {
      // ok
    }

    // attempt to get session id
    let sessionId = null;
    if (entry.body && entry.body.data && entry.body.data.object && entry.body.data.object.id) {
      const id = entry.body.data.object.id;
      if (id && id.startsWith('cs_')) sessionId = id;
    }
    // sometimes body is the object itself
    if (!sessionId && entry.body && entry.body.id && entry.body.id.startsWith('cs_')) sessionId = entry.body.id;
    // some entries include nested ids
    if (!sessionId && entry.body && entry.body.data && entry.body.data.object && entry.body.data.object.payment_intent && entry.body.data.object.payment_intent.startsWith('pi_')) {
      // can't map to cs_
    }

    if (sessionId && sessionIds.has(sessionId) && entry.body && (entry.body.type === 'checkout.session.completed' || (entry.body && entry.body.data && entry.body.data.object && entry.body.data.object.object === 'checkout.session'))) {
      const hasSig = entry.headers && (entry.headers['stripe-signature'] || entry.headers['stripe-signature'.toLowerCase()]);
      matches.push({timestamp: entry.timestamp, sessionId, eventId: entry.body.id || (entry.body && entry.body.data && entry.body.data.object && entry.body.data.object.id) || null, headers: entry.headers, hasSignature: !!hasSig, rawBody: entry.rawBody});
    }
  } catch (e) {
    // ignore parse errors
  }
}

fs.writeFileSync(outPath, matches.map(m=>JSON.stringify(m)).join('\n'));
console.log('wrote', matches.length, 'matches to', outPath);
