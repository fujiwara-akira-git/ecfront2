import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const linesParam = url.searchParams.get('lines') || '200'
    let lines = parseInt(linesParam, 10)
    if (isNaN(lines) || lines <= 0) lines = 200
    if (lines > 1000) lines = 1000

    // Optional token protection: if DEBUG_STRIPE_RAW_TOKEN is set in env,
    // require the matching token either as query param `token` or header `x-debug-token`.
    const tokenEnv = process.env.DEBUG_STRIPE_RAW_TOKEN
    if (tokenEnv) {
      const provided = url.searchParams.get('token') || req.headers.get('x-debug-token') || ''
      if (!provided || provided !== tokenEnv) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
    }

    const dbgPath = path.join(os.tmpdir(), 'stripe-webhook-raw-base64.log')
    if (!fs.existsSync(dbgPath)) {
      return NextResponse.json({ lines: [], message: 'log file not found', path: dbgPath })
    }

    const raw = await fs.promises.readFile(dbgPath, 'utf8')
    const allLines = raw.split('\n').filter(Boolean)
    const slice = allLines.slice(-lines)
    // Try to parse each line as JSON; fallback to raw string if parse fails
    const parsed = slice.map((l) => {
      try {
        return JSON.parse(l)
      } catch (e) {
        return { raw: l }
      }
    })

    return NextResponse.json({ lines: parsed, path: dbgPath, count: parsed.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
