import { NextResponse } from 'next/server'
import fs from 'fs/promises'

const DATA_DIR = '.data'
const EVENTS_FILE = `${DATA_DIR}/square-events.json`
const INVENTORY_FILE = `${DATA_DIR}/inventory.json`

async function loadEvents(): Promise<any[]> {
  const txt = await fs.readFile(EVENTS_FILE, 'utf8').catch(() => '[]')
  return JSON.parse(txt || '[]')
}

async function loadInventory(): Promise<Record<string, number>> {
  const txt = await fs.readFile(INVENTORY_FILE, 'utf8').catch(() => '{}')
  return JSON.parse(txt || '{}')
}

async function saveInventory(inv: Record<string, number>) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(inv, null, 2))
}

// POST /api/inventory/sync
export async function POST(req: Request) {
  // Optional secret protection for cron/manual trigger
  const secretHeader = req.headers.get('x-sync-secret') || ''
  const expected = process.env.INVENTORY_SYNC_SECRET || ''
  if (expected && secretHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Allow optional body to control range or mode (not used currently)
  await req.json().catch(() => ({}))

  // Simple nightly job: read events, deduct inventory based on reported line_items
  const events = await loadEvents()
  const inv = await loadInventory()

  for (const e of events) {
    try {
      const bodyEvent = e.event || e || {}
      const data = bodyEvent.data || bodyEvent
      const items = (data?.object?.line_items) || (data?.object?.order?.line_items) || []
      for (const li of items) {
        const pid = li?.catalog_object_id || li?.product_id || li?.id || String(li?.name || '')
        const qtyRaw = li?.quantity ?? li?.quantity_unit?.amount ?? 0
        const qty = Number(qtyRaw) || 0
        if (!pid) continue
        inv[pid] = (inv[pid] || 0) - qty
      }
    } catch (err) {
      // ignore per-event errors but continue processing
      console.error('inventory sync event error', err)
    }
  }

  await saveInventory(inv)

  // Rotate events after processing
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(EVENTS_FILE, '[]')

  return NextResponse.json({ ok: true, inventory: inv, processed: events.length })
}
