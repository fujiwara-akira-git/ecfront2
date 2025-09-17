const getEnv = (key: string, fallback?: string) => {
  const val = process.env[key];
  if (typeof val === 'undefined' || val === '') return fallback;
  return val;
}

export const config = {
  NEXTAUTH_URL: getEnv('NEXTAUTH_URL', 'http://localhost:3000'),
  NEXTAUTH_SECRET: getEnv('NEXTAUTH_SECRET'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: getEnv('STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnv('STRIPE_WEBHOOK_SECRET'),
  YAMATO_TEST_MODE: getEnv('YAMATO_TEST_MODE', 'true') === 'true',
  JAPANPOST_TEST_MODE: getEnv('JAPANPOST_TEST_MODE', 'true') === 'true',
  YAMATO_API_KEY: getEnv('YAMATO_API_KEY'),
  YAMATO_BASE_URL: getEnv('YAMATO_BASE_URL', 'https://api.yamato.example'),
  JAPANPOST_API_KEY: getEnv('JAPANPOST_API_KEY'),
  JAPANPOST_CLIENT_SECRET: getEnv('JAPANPOST_CLIENT_SECRET'),
  JAPANPOST_BASE_URL: getEnv('JAPANPOST_BASE_URL', 'https://api.japanpost.example'),
  getBaseUrl() {
    return this.NEXTAUTH_URL || 'http://localhost:3000';
  }
}

export default config;
