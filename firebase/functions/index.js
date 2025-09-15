// Minimal Firebase Cloud Functions examples for webhook and nightly sync
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { verifySquareSignatureFromReq } = require('./verify')
admin.initializeApp()
const db = admin.firestore()

function getHeader(req, name) {
  // Firebase functions uses Express-like req
  return req.get ? req.get(name) : req.headers && req.headers[name.toLowerCase()]
}

function verifySquareSignature(req, bodyString) {
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  if (!sigKey) return true // permissive in dev when key not set

  const signature = getHeader(req, 'x-square-signature') || getHeader(req, 'x-square-hmacsha256') || ''
  if (!signature) return false

  // Try HMAC-SHA256 (common) then HMAC-SHA1 fallback
  const tryVerify = (alg) => {
    try {
      const h = crypto.createHmac(alg, sigKey).update(bodyString).digest('base64')
      return h === signature
    } catch (e) {
      return false
    }
  }

  if (tryVerify('sha256')) return true
  if (tryVerify('sha1')) return true
  return false
}

exports.webhook = functions.https.onRequest(async (req, res) => {
  try {
    // Read raw body string for signature verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {})
    const ok = verifySquareSignatureFromReq(req, rawBody)
    if (!ok) {
      console.warn('square webhook: signature verification failed')
      return res.status(401).send({ error: 'invalid signature' })
    }

    const body = req.body || {}
    // Save raw event
    await db.collection('payments').add({ provider: 'square', raw: body, receivedAt: admin.firestore.FieldValue.serverTimestamp() })

    // Optionally create/update order
    const items = (body && body.data && body.data.object && body.data.object.order && body.data.object.order.line_items) || []
    if (items.length) {
      const order = {
        items: items.map(i => ({ sku: i.catalog_object_id || i.name, qty: Number(i.quantity) || 1, price: Number(i.base_price_money && i.base_price_money.amount || 0) })),
        total: Number((body && body.data && body.data.object && body.data.object.order && body.data.object.order.total_money && body.data.object.order.total_money.amount) || 0),
        status: 'paid',
        provider: 'square',
        providerPaymentId: body && body.id || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
      await db.collection('orders').add(order)
    }

    res.status(200).send({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: 'internal' })
  }
})

exports.nightlySync = functions.pubsub.schedule('0 2 * * *').timeZone('Asia/Tokyo').onRun(async (context) => {
  // Simple example: read payments created since last run and deduct inventory
  const paymentsSnap = await db.collection('payments').where('processed', '!=', true).limit(1000).get()
  const batch = db.batch()
  const invRef = db.collection('inventory')

  for (const doc of paymentsSnap.docs) {
    const data = doc.data()
    const items = data && data.raw && data.raw.data && data.raw.data.object && data.raw.data.object.order && data.raw.data.object.order.line_items || []
    for (const i of items) {
      const sku = i.catalog_object_id || i.name
      const qty = Number(i.quantity) || 1
      const invDoc = invRef.doc(String(sku))
      // decrement using transaction-like update
      batch.set(invDoc, { qty: admin.firestore.FieldValue.increment(-qty) }, { merge: true })
    }
    batch.update(doc.ref, { processed: true })
  }

  await batch.commit()
  return null
})
