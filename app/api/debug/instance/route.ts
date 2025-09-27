import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tailLines(text: string, n = 200) {
  const lines = text.split('\n').filter(Boolean)
  return lines.slice(-n)
}

export async function GET() {
  try {
    const tmpDir = os.tmpdir()
    const files = {
      instanceIds: path.join(tmpDir, 'stripe-webhook-instance-ids.log'),
      hmac: path.join(tmpDir, 'stripe-webhook-hmac-debug.log'),
      rawBase64: path.join(tmpDir, 'stripe-webhook-raw-base64.log'),
      webhookErrors: path.join(tmpDir, 'stripe-webhook-errors.jsonl'),
      handlerDebug: path.join(tmpDir, 'stripe-handler-debug.log')
    }
    const out: Record<string, string[] | null> = { instanceIds: null, hmac: null, rawBase64: null, webhookErrors: null, handlerDebug: null }

    try { out.instanceIds = tailLines(fs.readFileSync(files.instanceIds, 'utf8') || '', 200) } catch (e) { out.instanceIds = null }
    try { out.hmac = tailLines(fs.readFileSync(files.hmac, 'utf8') || '', 200) } catch (e) { out.hmac = null }
    try { out.rawBase64 = tailLines(fs.readFileSync(files.rawBase64, 'utf8') || '', 200) } catch (e) { out.rawBase64 = null }
    try { out.webhookErrors = tailLines(fs.readFileSync(files.webhookErrors, 'utf8') || '', 200) } catch (e) { out.webhookErrors = null }
    try { out.handlerDebug = tailLines(fs.readFileSync(files.handlerDebug, 'utf8') || '', 200) } catch (e) { out.handlerDebug = null }

    return NextResponse.json({ ok: true, instance: { hostname: os.hostname() }, logs: out })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
