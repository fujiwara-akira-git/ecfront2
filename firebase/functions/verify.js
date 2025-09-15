const crypto = require('crypto')

function normalizeHeader(headers, name) {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name)
  return headers[name.toLowerCase()] || headers[name]
}

function computeHmacBase64(alg, key, payload) {
  return crypto.createHmac(alg, key).update(payload).digest('base64')
}

function verifySquareSignature(signature, bodyString, sigKey) {
  const key = sigKey || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''
  if (!key) {
    return true
  }
  if (!signature) return false

  const tryVerify = (alg) => {
    try {
      const h = computeHmacBase64(alg, key, bodyString)
      return h === signature
    } catch (e) {
      return false
    }
  }

  if (tryVerify('sha256')) return true
  if (tryVerify('sha1')) return true
  return false
}

function verifySquareSignatureFromReq(req, bodyString) {
  const signature = normalizeHeader(req.headers || req, 'x-square-signature') || normalizeHeader(req.headers || req, 'x-square-hmacsha256')
  return verifySquareSignature(signature, bodyString)
}

module.exports = { verifySquareSignature, verifySquareSignatureFromReq }
