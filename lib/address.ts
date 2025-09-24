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

// Split a Japanese address string into prefecture, city/ward/town, and the remaining part.
// Best-effort parser using common suffixes (都道府県 and 市区町村郡). Returns empty fields when not found.
export function splitJapaneseAddress(address?: string): { prefecture?: string; city?: string; rest?: string } {
  if (!address) return {}
  let s = address.replace(/〒/g, '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim()
  // normalize whitespace
  s = s.replace(/\s+/g, ' ')

  // Try to extract prefecture (ends with 都, 道, 府, 県)
  const prefRe = /(.+?[都道府県])/u
  const prefMatch = s.match(prefRe)
  let prefecture: string | undefined
  let afterPref = s
  if (prefMatch && prefMatch[1]) {
    prefecture = prefMatch[1].trim()
    afterPref = s.slice(prefMatch.index! + prefecture.length).trim()
  }

  // Try to extract city/ward/town/village (市, 区, 町, 村, 郡)
  const cityRe = /(.+?[市区町村郡])/u
  const cityMatch = afterPref.match(cityRe)
  let city: string | undefined
  let rest: string | undefined
  if (cityMatch && cityMatch[1]) {
    city = cityMatch[1].trim()
    rest = afterPref.slice(city.length).trim()
  } else {
    // If no prefecture found, try to find city in entire string
    if (!prefecture) {
      const altCityMatch = s.match(cityRe)
      if (altCityMatch && altCityMatch[1]) {
        city = altCityMatch[1].trim()
        rest = s.slice(altCityMatch.index! + city.length).trim()
      }
    } else {
      // no city found after prefecture: treat remaining as rest
      rest = afterPref || undefined
    }
  }

  return { prefecture, city, rest }
}

