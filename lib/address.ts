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

// List of Japanese prefectures (short names) for a best-effort prefecture detection
const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
]

function findPrefectureInString(s?: string): string | undefined {
  if (!s) return undefined
  for (const p of PREFECTURES) {
    if (s.includes(p)) return p
  }
  return undefined
}

// Format address to prefecture + city + rest in that order using shippingAddress then userAddress as fallback.
export function formatJapaneseAddress(shippingAddress?: string, userAddress?: string): string {
  const sh = shippingAddress ? shippingAddress.replace(/\s+/g, ' ').trim() : ''
  const us = userAddress ? userAddress.replace(/\s+/g, ' ').trim() : ''

  // Prefer shipping address as source; fall back to user address
  const source = sh || us || ''
  if (!source) return ''

  // Try to detect prefecture by explicit match first
  let prefecture = findPrefectureInString(source)

  // If not found, use splitJapaneseAddress which may extract a prefecture-like token
  if (!prefecture) {
    const sp = splitJapaneseAddress(source)
    if (sp.prefecture) prefecture = sp.prefecture
  }

  // After removing prefecture, attempt to get city and rest
  let remainder = source
  if (prefecture) {
    const idx = remainder.indexOf(prefecture)
    if (idx !== -1) remainder = remainder.slice(idx + prefecture.length).trim()
  }

  // City: look for first occurrence of 市/区/町/村/郡
  let city: string | undefined
  const cityRe = /(.+?[市区町村郡])/u
  const cm = remainder.match(cityRe)
  if (cm && cm[1]) {
    city = cm[1].trim()
    remainder = remainder.slice(city.length).trim()
  } else {
    // If not found in remainder, try whole source (covers cases where prefecture not stripped)
    const cm2 = source.match(cityRe)
    if (cm2 && cm2[1]) {
      city = cm2[1].trim()
      // derive remainder by removing prefecture+city from source
      let temp = source
      if (prefecture) temp = temp.replace(prefecture, '')
      remainder = temp.replace(city, '').trim()
    }
  }

  // If still missing city, try to use splitJapaneseAddress on user address as fallback
  if (!city && us) {
    const usParts = splitJapaneseAddress(us)
    if (usParts.city) {
      city = usParts.city
      if (!prefecture && usParts.prefecture) prefecture = usParts.prefecture
      remainder = usParts.rest || remainder
    }
  }

  // Final normalization: trim and return components in order
  const parts: string[] = []
  if (prefecture) parts.push(prefecture)
  if (city) parts.push(city)
  if (remainder) parts.push(remainder)

  // If no prefecture/city detected, attempt a best-effort split using splitJapaneseAddress
  if (parts.length === 0) {
    const sp2 = splitJapaneseAddress(source)
    if (sp2.prefecture) parts.push(sp2.prefecture)
    if (sp2.city) parts.push(sp2.city)
    if (sp2.rest) parts.push(sp2.rest)
  }

  return parts.join(' ').trim()
}

// Small best-effort postal code -> prefecture/city mapping for cases where
// the shippingAddress itself is too short (e.g. "桜田") but postalCode is
// available. This map is intentionally small and can be extended as needed.
const POSTAL_TO_AREA: Record<string, { prefecture?: string; city?: string }> = {
  // examples observed in local test data
  '3400203': { prefecture: '埼玉県', city: '久喜市' }, // 340-0203 桜田
  '1040061': { prefecture: '東京都', city: '中央区' }, // 104-0061 銀座
  '3400204': { prefecture: '埼玉県', city: '久喜市' }, // 340-0204 上川崎
  '3400205': { prefecture: '埼玉県', city: '久喜市' }, // 340-0205 外野
  '3400202': { prefecture: '埼玉県', city: '久喜市' }, // 340-0202 東大輪
}

export function lookupAreaFromPostal(postal?: string): { prefecture?: string; city?: string } | undefined {
  if (!postal) return undefined
  // normalize: remove non-digits
  const raw = String(postal).replace(/[^0-9]/g, '')
  if (raw.length < 3) return undefined
  // Try exact 7-digit key first
  if (raw.length >= 7) {
    const seven = raw.slice(0, 7)
    if (POSTAL_TO_AREA[seven]) return POSTAL_TO_AREA[seven]
  }
  // Try 3-digit prefix (less precise) - not populated by default,
  // kept for future extension
  const three = raw.slice(0, 3)
  if (POSTAL_TO_AREA[three]) return POSTAL_TO_AREA[three]
  return undefined
}

