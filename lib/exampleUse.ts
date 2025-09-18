import { prisma } from './prisma'
import { runWithRetry } from './dbWithRetry'

export async function createOrderSafe(data: Parameters<typeof prisma.order.create>[0]) {
  return runWithRetry(() => prisma.order.create(data), { retries: 3 })
}
