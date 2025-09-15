const { verifySquareSignature } = require('./verify')
const crypto = require('crypto')

const secret = 'test-secret'
const payload = JSON.stringify({ hello: 'world', ts: Date.now() })

// compute expected signature
const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64')

process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = secret

const ok = verifySquareSignature(sig, payload, secret)
console.log('verify result', ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
