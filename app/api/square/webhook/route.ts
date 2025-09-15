import { NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs/promises'

const DATA_DIR = '.data'
const EVENTS_FILE = `${DATA_DIR}/square-events.json`

async function appendEvent(obj: any) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const prev = await fs.readFile(EVENTS_FILE, 'utf8').catch(() => '[]')
  const arr = JSON.parse(prev || '[]')
  arr.push({ receivedAt: new Date().toISOString(), event: obj })
  await fs.writeFile(EVENTS_FILE, JSON.stringify(arr, null, 2))
}

export async function POST(request: Request) {
  const bodyText = await request.text()

  // Optional signature verification
  const signature = request.headers.get('x-square-signature') || request.headers.get('x-square-signature-v2') || ''
  const secret = process.env.SQUARE_WEBHOOK_SECRET || ''
  if (secret && signature) {
    try {
      const h = crypto.createHmac('sha256', secret).update(bodyText).digest('base64')
      const ok = crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signature))
      if (!ok) return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
    } catch (e) {
      // fallthrough: if verification fails due to length mismatch, respond 401
      return NextResponse.json({ ok: false, error: 'signature verify failed' }, { status: 401 })
    }
  }

  let json: any = null
  try {
    json = JSON.parse(bodyText)
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  // Persist event for nightly processing
  await appendEvent(json)

  return NextResponse.json({ ok: true })
}
