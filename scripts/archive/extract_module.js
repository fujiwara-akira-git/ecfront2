const fs = require('fs');
const path = require('path');
if (process.argv.length < 4) {
  console.error('Usage: node extract_module.js <chunk-file> <moduleId> [out-file]');
  process.exit(2);
}
const file = process.argv[2];
const moduleId = process.argv[3];
const outFile = process.argv[4] || null;
const s = fs.readFileSync(file, 'utf8');
const needle = moduleId + ':';
const idx = s.indexOf(needle);
if (idx === -1) {
  console.error('module id not found');
  process.exit(3);
}
// find first `{` after the colon
let i = s.indexOf('{', idx);
if (i === -1) {
  console.error('no opening brace found after module id');
  process.exit(4);
}
let depth = 0;
let out = '';
let inSingle = false, inDouble = false, inTemplate = false, inRegex = false;
let prev = '';
for (; i < s.length; i++) {
  const ch = s[i];
  out += ch;
  if (inSingle) {
    if (ch === '\\' && i+1 < s.length) { out += s[++i]; continue; }
    if (ch === "'") inSingle = false;
    continue;
  }
  if (inDouble) {
    if (ch === '\\' && i+1 < s.length) { out += s[++i]; continue; }
    if (ch === '"') inDouble = false;
    continue;
  }
  if (inTemplate) {
    if (ch === '\\' && i+1 < s.length) { out += s[++i]; continue; }
    if (ch === '`') inTemplate = false;
    continue;
  }
  if (inRegex) {
    if (ch === '\\' && i+1 < s.length) { out += s[++i]; continue; }
    if (ch === '/') inRegex = false;
    continue;
  }
  // handle comments
  if (ch === '/' && s[i+1] === '/') {
    // line comment
    out += s[++i];
    i++;
    while (i < s.length && s[i] !== '\n') { out += s[i++]; }
    continue;
  }
  if (ch === '/' && s[i+1] === '*') {
    out += s[++i];
    i++;
    while (i < s.length && !(s[i] === '*' && s[i+1] === '/')) { out += s[i++]; }
    if (i < s.length) { out += s[++i]; }
    continue;
  }
  if (ch === "'") { inSingle = true; continue; }
  if (ch === '"') { inDouble = true; continue; }
  if (ch === '`') { inTemplate = true; continue; }
  if (ch === '/') {
    // could be regex or division; simple heuristic: if previous non-space is one of (=,:;({[!&|?+-~*%) then it's regex
    let j = i-1; while (j >= 0 && /\s/.test(s[j])) j--;
    const prevChar = j >= 0 ? s[j] : '';
    if (("=,:;({[!&|?+-~*%") .includes(prevChar) ) {
      inRegex = true; continue;
    }
  }
  if (ch === '{') { depth++; }
  else if (ch === '}') { depth--; if (depth === 0) { break; } }
  prev = ch;
}
if (depth !== 0) {
  console.error('unbalanced braces, depth=' + depth);
  process.exit(5);
}
// include trailing characters until next comma if present
let j = i+1;
while (j < s.length && /[\s,]/.test(s[j])) { out += s[j++]; }
if (outFile) fs.writeFileSync(outFile, out, 'utf8');
process.stdout.write(out);
