import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

export async function GET(req: Request) {
  try {
    // Optional token protection: respect DEBUG_STRIPE_RAW_TOKEN like other debug routes
    const url = new URL(req.url)
    const tokenEnv = process.env.DEBUG_STRIPE_RAW_TOKEN
    if (tokenEnv) {
      const provided = url.searchParams.get('token') || req.headers.get('x-debug-token') || ''
      if (!provided || provided !== tokenEnv) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
    }

    const dbgPath = path.join(os.tmpdir(), 'stripe-webhook-raw-base64.log')

    const secret = process.env.STRIPE_WEBHOOK_SECRET || null
    const webhookSecretPresent = !!secret
    // Compute SHA256 hash of the secret if present (do NOT expose the secret itself)
    const hash = secret ? crypto.createHash('sha256').update(secret).digest('hex') : null

    const entry = {
      ts: new Date().toISOString(),
      action: 'runtime_webhook_secret_hash',
      webhookSecretPresent,
      hash,
      note: 'sha256 of STRIPE_WEBHOOK_SECRET — safe for comparison, not the secret itself',
    }

    // Ensure directory exists (os.tmpdir() should exist); append JSONL line
    const line = JSON.stringify(entry) + '\n'
    await fs.promises.appendFile(dbgPath, line, { encoding: 'utf8' })

    return NextResponse.json({ ok: true, wrote: entry, path: dbgPath })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
