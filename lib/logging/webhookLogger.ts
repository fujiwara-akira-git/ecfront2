import { captureException, captureMessage, initSentry } from './sentry';
import os from 'os';
import path from 'path';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
initSentry(SENTRY_DSN);

export async function logWebhook(
  kind: string,
  payload: unknown,
  headers: Record<string, string> = {},
  meta: Record<string, unknown> = {}
) {
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
    captureMessage(`[webhook] ${kind}`, 'info');
  } catch (e) {
    // also report to Sentry if available
    try {
      if (e instanceof Error) {
        captureException(e, { kind, meta });
      } else {
        captureException(new Error(String(e)), { kind, meta });
      }
    } catch (err2) {
      console.warn('[webhook] sentry capture failed', err2);
    }
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

function summarizePayload(p: unknown): string | Record<string, string> | null {
  if (p === undefined || p === null) return null;
  if (typeof p === 'string') return p.slice(0, 1024);
  if (typeof p === 'object') {
    try {
      const obj = p as Record<string, unknown>;
      const copy: Record<string, string> = {};
      if (typeof obj.id === 'string') copy.id = obj.id;
      if (typeof obj.type === 'string') copy.type = obj.type;
      // nested: data.object.id
      if (obj.data && typeof obj.data === 'object') {
        const data = obj.data as Record<string, unknown>;
        if (data.object && typeof data.object === 'object') {
          const o = data.object as Record<string, unknown>;
          if (typeof o.id === 'string') copy.objectId = o.id;
        }
      }
      return Object.keys(copy).length ? copy : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}
