#!/usr/bin/env node
const { Client } = require('pg')

async function run() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Please set DATABASE_URL in environment before running')
    process.exit(2)
  }

  const client = new Client({ connectionString: url })
  try {
    await client.connect()
    console.log('Connected to DB')

    const nowRes = await client.query("SELECT now() as now")
    console.log('now:', nowRes.rows)

    const connCount = await client.query(`SELECT count(*)::int as count FROM pg_stat_activity WHERE datname = current_database()`) 
    console.log('connection_count:', connCount.rows)

    const byState = await client.query(`SELECT state, count(*)::int as count FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`)
    console.log('connections_by_state:', byState.rows)

    const recentBackends = await client.query(`SELECT pid, usename, application_name, client_addr, backend_start, state, left(query, 200) as query FROM pg_stat_activity WHERE datname = current_database() ORDER BY backend_start DESC LIMIT 20`)
    console.log('recent_backends (limit 20):')
    console.table(recentBackends.rows)

    const dbStats = await client.query(`SELECT * FROM pg_stat_database WHERE datname = current_database()`)
    console.log('db_stats:', dbStats.rows)

    const maxConns = await client.query(`SHOW max_connections`)
    console.log('max_connections:', maxConns.rows)

    const longQueries = await client.query(`SELECT pid, usename, application_name, client_addr, state, now() - query_start AS duration, left(query, 400) as query FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND now() - query_start > interval '1 second' ORDER BY duration DESC LIMIT 30`)
    console.log('long_active_queries (>1s):')
    console.table(longQueries.rows)

    console.log('\nDone')
  } catch (err) {
    console.error('error collecting metrics:', err)
    process.exitCode = 3
  } finally {
    await client.end()
  }
}

run()
