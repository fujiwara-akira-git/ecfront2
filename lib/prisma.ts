import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// PrismaClient singleton for serverless environments with Neon optimization
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Please set DATABASE_URL in your environment before starting the server.')
}

// Diagnostic logging removed to avoid leaking credentials in production logs.

const client = global.__prisma ?? (global.__prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
}))
export const prisma = client

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma