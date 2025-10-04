// Skip prisma generate during install on Vercel; run generate during build instead
const { execSync } = require('child_process');
const path = require('path');

if (process.env.VERCEL === '1' || process.env.CI === '1') {
  // Running in CI/Vercel: do not generate during install
  console.log('[prisma-postinstall] Skipping prisma generate during install.');
  process.exit(0);
}

// Local install: run generator with minimal logging
const genScript = path.join(__dirname, 'prisma-generate.js');
console.log('[prisma-postinstall] Running prisma generate');
try {
  execSync(`node ${genScript}`, { stdio: 'inherit' });
} catch (e) {
  console.error('[prisma-postinstall] prisma generate failed');
  process.exit(1);
}
