import { prisma } from '../lib/prisma'

async function main() {
  try {
    console.log('Using DATABASE_URL=', !!process.env.DATABASE_URL)

    const now = await prisma.$queryRaw`SELECT now() as now`
    console.log('now:', now)

    const connCount = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    console.log('connection_count:', connCount)

    const byState = await prisma.$queryRaw`
      SELECT state, count(*)::int as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `
    console.log('connections_by_state:', byState)

    const topBackends = await prisma.$queryRaw`
      SELECT pid, usename, application_name, client_addr, backend_start, state, left(query, 200) as query
      FROM pg_stat_activity
      WHERE datname = current_database()
      ORDER BY backend_start DESC
      LIMIT 20
    `
    console.log('recent_backends:', topBackends)

    const dbStats = await prisma.$queryRaw`
      SELECT * FROM pg_stat_database WHERE datname = current_database()
    `
    console.log('db_stats:', dbStats)

    const maxConns = await prisma.$queryRaw`SHOW max_connections`
    console.log('max_connections:', maxConns)

    // optional: check wait events / long queries
    const longQueries = await prisma.$queryRaw`
      SELECT pid, usename, application_name, client_addr, state, now() - query_start AS duration, left(query, 400) as query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND now() - query_start > interval '1 second'
      ORDER BY duration DESC
      LIMIT 30
    `
    console.log('long_active_queries (>1s):', longQueries)

  } catch (err) {
    console.error('check_neon_metrics error:', err)
    process.exitCode = 2
  } finally {
    await prisma.$disconnect()
  }
}

main()
