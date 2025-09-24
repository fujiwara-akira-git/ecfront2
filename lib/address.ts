export function extractPostalCode(address?: string): string | null {
  if (!address) return null

  // Normalize: convert full-width digits to half-width, remove '〒', normalize whitespace/newlines
  let s = address.replace(/〒/g, '')
  // full-width to half-width digits
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  // normalize whitespace and newlines
  s = s.replace(/[\s\u3000]+/g, ' ').trim()

  // Japanese postal code patterns: 123-4567, 1234567
  const re = /(?:\b)?(\d{3}-?\d{4})(?:\b)?/
  const m = s.match(re)
  if (m && m[1]) {
    const raw = m[1].replace(/[^0-9]/g, '')
    if (raw.length >= 7) {
      return raw.slice(0, 3) + '-' + raw.slice(3, 7)
    }
  }

  return null
}

