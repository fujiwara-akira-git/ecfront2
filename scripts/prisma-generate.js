const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine schema path (can be overridden by PRISMA_SCHEMA env)
let schema = process.env.PRISMA_SCHEMA;
if (!schema) {
  schema = path.join('prisma', 'schema.prisma');
}

console.log(`[prisma-generate] Using schema: ${schema}`);

// Primary flow: always run `npx prisma generate` to ensure generated client matches schema
try {
  console.log('[prisma-generate] Running `npx prisma generate`...');
  execSync(`npx prisma generate --schema=${schema}`, { stdio: 'inherit' });
  console.log('[prisma-generate] Prisma client generated successfully.');
  process.exit(0);
} catch (genErr) {
  console.error('[prisma-generate] `prisma generate` failed:', genErr && genErr.message ? genErr.message : genErr);
  console.warn('[prisma-generate] Attempting fallback: copy bundled client from .prisma/client if present. This is NOT recommended and only a best-effort fallback.');

  try {
    const src = path.join(process.cwd(), '.prisma', 'client');
    const dest = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
    if (fs.existsSync(src)) {
      // Ensure destination directory exists
      fs.mkdirSync(dest, { recursive: true });
      console.log('[prisma-generate] Copying bundled client from', src, 'to', dest);
      // Use a safe recursive copy
      fs.cpSync(src, dest, { recursive: true });
      console.log('[prisma-generate] Fallback copy completed. NOTE: Verify the client versions match your runtime.');
      process.exit(0);
    } else {
      console.error('[prisma-generate] No bundled client found at', src, '- cannot fallback.');
      process.exit(1);
    }
  } catch (copyErr) {
    console.error('[prisma-generate] Fallback copy failed:', copyErr && copyErr.message ? copyErr.message : copyErr);
    process.exit(1);
  }
}
