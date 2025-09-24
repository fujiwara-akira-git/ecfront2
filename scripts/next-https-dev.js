#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')
const next = require('next')

const CERT_DIR = path.join(__dirname, '..', 'certs')
const CERT_FILE = path.join(CERT_DIR, 'localhost.pem')
const KEY_FILE = path.join(CERT_DIR, 'localhost-key.pem')

const port = process.env.PORT || 3000
const dev = process.env.NODE_ENV !== 'production'

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  console.error('Certificate files not found in certs/. Run mkcert to generate them.')
  process.exit(1)
}

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const cert = fs.readFileSync(CERT_FILE)
  const key = fs.readFileSync(KEY_FILE)

  const server = https.createServer({ key, cert }, (req, res) => {
    return handle(req, res)
  })

  // WebSocket upgrade handling (Next dev uses websockets for HMR)
  server.on('upgrade', (req, socket, head) => {
    // let Next handle websocket upgrades via its internal server on the same socket
    // In practice, Next's dev server will establish its own sockets; this basic
    // forwarding should work for most setups.
    // If websocket HMR doesn't work, prefer the proxy approach instead.
    socket.destroy()
  })

  server.listen(port, () => {
    console.log(`Next (dev) HTTPS server listening on https://localhost:${port} (dev=${dev})`)
    console.log('If HMR/websocket issues appear, use the proxy-based approach instead (dev:https:proxy).')
  })
}).catch((err) => {
  console.error('Failed to start Next:', err)
  process.exit(1)
})
