import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import os from 'os'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const linesParam = String(req.query.lines || '200')
    let lines = parseInt(linesParam, 10)
    if (isNaN(lines) || lines <= 0) lines = 200
    if (lines > 1000) lines = 1000

    const tokenEnv = process.env.DEBUG_STRIPE_RAW_TOKEN
    if (tokenEnv) {
      const provided = String(req.query.token || req.headers['x-debug-token'] || '')
      if (!provided || provided !== tokenEnv) {
        return res.status(401).json({ error: 'unauthorized' })
      }
    }

    const dbgPath = path.join(os.tmpdir(), 'stripe-webhook-raw-base64.log')
    if (!fs.existsSync(dbgPath)) {
      return res.status(200).json({ lines: [], message: 'log file not found', path: dbgPath })
    }

    const raw = await fs.promises.readFile(dbgPath, 'utf8')
    const allLines = raw.split('\n').filter(Boolean)
    const slice = allLines.slice(-lines)
    const parsed = slice.map((l) => {
      try { return JSON.parse(l) } catch (e) { return { raw: l } }
    })

    return res.status(200).json({ lines: parsed, path: dbgPath, count: parsed.length })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
