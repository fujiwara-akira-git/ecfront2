const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 環境変数で schema を切り替え
let schema = process.env.PRISMA_SCHEMA;
if (!schema) {
  if (process.env.VERCEL === '1' || process.env.CI === '1') {
    schema = path.join('prisma', 'schema.vercel.prisma');
  } else {
    schema = path.join('prisma', 'schema.prisma');
  }
}

// Minimal log for which schema is used
console.log(`[prisma-generate] Using schema: ${schema}`);
// If project already contains a generated prisma client with a matching engine, skip generate.
try {
  const enginePath = path.join(process.cwd(), '.prisma', 'client', 'libquery_engine-rhel-openssl-3.0.x.so.node');
  if (fs.existsSync(enginePath)) {
    console.log('[prisma-generate] Found bundled rhel engine at', enginePath, '- installing bundled client into node_modules');
    try {
      const src = path.join(process.cwd(), '.prisma', 'client')
      const dest = path.join(process.cwd(), 'node_modules', '@prisma', 'client')
      // ensure destination exists
      fs.mkdirSync(dest, { recursive: true })
      // copy files recursively
      fs.cpSync(src, dest, { recursive: true })
      console.log('[prisma-generate] Copied bundled prisma client to', dest)
      process.exit(0)
    } catch (copyErr) {
      console.error('[prisma-generate] Failed to copy bundled client:', copyErr)
      // fallthrough to attempt running generate
    }
  }
} catch (e) {
  // ignore
}
try {
  execSync(`npx prisma generate --schema=${schema}`, { stdio: 'inherit' });
} catch (e) {
  console.error('[prisma-generate] Failed to generate Prisma client.');
  if (e && e.message) console.error(e.message);
  process.exit(1);
}
