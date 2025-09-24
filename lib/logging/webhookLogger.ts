import { captureException, captureMessage, initSentry } from './sentry';
import os from 'os';
import path from 'path';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
initSentry(SENTRY_DSN);

export async function logWebhook(kind: string, payload: any, headers: Record<string, string> = {}, meta: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    kind,
    timestamp,
    headers: Object.fromEntries(Object.entries(headers).slice(0, 50)),
    payloadSummary: summarizePayload(payload),
    meta,
  };

  // Console (Vercel) - always
  console.log('[webhook]', JSON.stringify(entry));

  // Sentry - best effort
  try {
    captureMessage(`[webhook] ${kind}`, 'info' as any);
  } catch (e) {
    // also report to Sentry if available
  try { captureException(e as Error, { kind, meta }); } catch (err2) { console.warn('[webhook] sentry capture failed', err2) }
    // ignore
  }

  // Optionally save full payload to local tmp for dev debugging
  if (process.env.NODE_ENV !== 'production') {
    try {
      const tmpdir = os.tmpdir();
      const filename = path.join(tmpdir, `webhook-${kind}-${Date.now()}.json`);
      await import('fs/promises').then(fs => fs.writeFile(filename, JSON.stringify({ payload, headers, meta }, null, 2)));
    } catch (e) {
      // ignore
    }
  }
}

function summarizePayload(p: any) {
  if (!p) return null;
  if (typeof p === 'string') return p.slice(0, 1024);
  try {
    const copy: any = {};
    if (p.id) copy.id = p.id;
    if (p.type) copy.type = p.type;
    if (p.data && p.data.object && p.data.object.id) copy.objectId = p.data.object.id;
    return copy;
  } catch (e) {
    return null;
  }
}
