// Minimal Firestore REST helpers targeting emulator when FIRESTORE_EMULATOR_HOST is set.
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-project'
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '' // e.g. localhost:8080

function baseUrl(): string {
  if (EMULATOR_HOST) {
    return `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  }
  // Not configured for production REST access.
  throw new Error('FIRESTORE_EMULATOR_HOST not set; server requires firebase-admin for production')
}

function docPath(collection: string, id?: string) {
  return id ? `${baseUrl()}/${collection}/${id}` : `${baseUrl()}/${collection}`
}

export async function createDoc(collection: string, id: string | null, data: Record<string, unknown>) {
  const url = id ? docPath(collection, id) : docPath(collection)
  const body = { fields: toFirestoreFields(data) }

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`createDoc failed: ${res.status} ${txt}`)
  }
  return res.json()
}

export async function patchDoc(collection: string, id: string, data: Record<string, unknown>) {
  const url = docPath(collection, id)
  // Firestore REST: PATCH with updateMask is more complex; for emulator keep simple: commit endpoint would be best.
  // We'll use a simple PATCH that replaces the document by writing fields
  const body = { fields: toFirestoreFields(data) }
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`patchDoc failed: ${res.status} ${txt}`)
  }
  return res.json()
}

function toFirestoreFields(obj: Record<string, unknown>) {
  const fields: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (v === null || v === undefined) continue
    if (typeof v === 'string') fields[k] = { stringValue: v }
    else if (typeof v === 'number') fields[k] = { integerValue: String(v) }
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v }
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(item => toValue(item)) } }
    else if (v instanceof Date) fields[k] = { timestampValue: v.toISOString() }
    else if (typeof v === 'object') fields[k] = { mapValue: { fields: toFirestoreFields(v as Record<string, unknown>) } }
    else fields[k] = { stringValue: String(v) }
  }
  return fields
}

function toValue(v: unknown): unknown {
  if (v === null) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'number') return { integerValue: String(v) }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'object' && v !== null) return { mapValue: { fields: toFirestoreFields(v as Record<string, unknown>) } }
  return { stringValue: String(v) }
}
