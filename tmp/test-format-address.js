// Quick test harness for formatJapaneseAddress logic (copied/adapted from lib/address.ts)
const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
]
function findPrefectureInString(s){ if(!s) return undefined; for(const p of PREFECTURES){ if(s.includes(p)) return p } return undefined }
function splitJapaneseAddress(address){ if(!address) return {}; let s = address.replace(/〒/g,'').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim(); s = s.replace(/\s+/g,' ');
 const prefRe = /(.+?[都道府県])/u; const prefMatch = s.match(prefRe); let prefecture; let afterPref = s; if(prefMatch && prefMatch[1]){ prefecture = prefMatch[1].trim(); afterPref = s.slice(prefMatch.index + prefecture.length).trim() }
 const cityRe = /(.+?[市区町村郡])/u; const cityMatch = afterPref.match(cityRe); let city; let rest; if(cityMatch && cityMatch[1]){ city = cityMatch[1].trim(); rest = afterPref.slice(city.length).trim() } else { if(!prefecture){ const altCityMatch = s.match(cityRe); if(altCityMatch && altCityMatch[1]){ city = altCityMatch[1].trim(); rest = s.slice(altCityMatch.index + city.length).trim() } } else { rest = afterPref || undefined } }
 return { prefecture, city, rest }
}
function formatJapaneseAddress(shippingAddress, userAddress){ const sh = shippingAddress ? shippingAddress.replace(/\s+/g,' ').trim() : ''; const us = userAddress ? userAddress.replace(/\s+/g,' ').trim() : ''; const source = sh || us || ''; if(!source) return ''; let prefecture = findPrefectureInString(source); if(!prefecture){ const sp = splitJapaneseAddress(source); if(sp.prefecture) prefecture = sp.prefecture }
 let remainder = source; if(prefecture){ const idx = remainder.indexOf(prefecture); if(idx !== -1) remainder = remainder.slice(idx + prefecture.length).trim() }
 let city; const cityRe = /(.+?[市区町村郡])/u; const cm = remainder.match(cityRe); if(cm && cm[1]){ city = cm[1].trim(); remainder = remainder.slice(city.length).trim() } else { const cm2 = source.match(cityRe); if(cm2 && cm2[1]){ city = cm2[1].trim(); let temp = source; if(prefecture) temp = temp.replace(prefecture,''); remainder = temp.replace(city,'').trim() } }
 if(!city && us){ const usParts = splitJapaneseAddress(us); if(usParts.city){ city = usParts.city; if(!prefecture && usParts.prefecture) prefecture = usParts.prefecture; remainder = usParts.rest || remainder } }
 const parts = []; if(prefecture) parts.push(prefecture); if(city) parts.push(city); if(remainder) parts.push(remainder);
 if(parts.length === 0){ const sp2 = splitJapaneseAddress(source); if(sp2.prefecture) parts.push(sp2.prefecture); if(sp2.city) parts.push(sp2.city); if(sp2.rest) parts.push(sp2.rest) }
 return parts.join(' ').trim()
}

const cases = [
 {sh:'銀座', user:'東京都中央区銀座1-2-3'},
 {sh:'銀座', user:'中央区銀座1-2-3'},
 {sh:'東京都中央区銀座1-2-3', user:''},
 {sh:'', user:'東京都中央区銀座1-2-3'},
 {sh:'千代田区', user:'東京都千代田区大手町1-1'},
 {sh:'銀座', user:'東京都中央区'},
 {sh:'銀座', user:''},
 {sh:'台東区上野', user:'東京都台東区上野4-5-6'},
]
for(const c of cases){ console.log('----'); console.log('shipping:', JSON.stringify(c.sh), 'user:', JSON.stringify(c.user)); console.log('formatted:', formatJapaneseAddress(c.sh, c.user)) }
