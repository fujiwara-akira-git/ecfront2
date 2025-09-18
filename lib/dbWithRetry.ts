type AsyncFn<T> = () => Promise<T>

function isTransientPrismaError(err: any) {
  if (!err) return false
  const code = err?.code || err?.errorCode || err?.clientVersion
  // Prisma transient/network-related errors: P1001 (connection), P1010 (tls), etc.
  const transientCodes = ['P1001', 'P1010', 'P1012', 'ECONNRESET']
  if (typeof code === 'string' && transientCodes.includes(code)) return true
  // fallback: check message
  const msg = String(err?.message || '')
  // Also treat fetch/TypeError network failures as transient
  if (/Failed to fetch|NetworkError|TypeError|ECONNREFUSED/i.test(msg)) return true
  return /closed|connection|timed out|Timeout|ECONNRESET/i.test(msg)
}

export async function runWithRetry<T>(fn: AsyncFn<T>, opts?: { retries?: number }): Promise<T> {
  const retries = opts?.retries ?? 3
  let attempt = 0
  let lastErr: any = null
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      attempt += 1
      if (attempt > retries || !isTransientPrismaError(err)) break
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 5000)
      // eslint-disable-next-line no-console
      try {
        console.warn(`[dbWithRetry] attempt ${attempt} failed: ${JSON.stringify(err)}`)
      } catch (e) {
        console.warn(`[dbWithRetry] attempt ${attempt} failed: ${String(err)}`)
      }
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw lastErr
}
