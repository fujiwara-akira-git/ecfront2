#!/usr/bin/env node
const https = require('https')
const http = require('http')
const httpProxy = require('http-proxy')
const fs = require('fs')
const path = require('path')

const CERT_DIR = path.join(__dirname, '..', 'certs')
const CERT_FILE = path.join(CERT_DIR, 'localhost.pem')
const KEY_FILE = path.join(CERT_DIR, 'localhost-key.pem')

const targetHost = 'localhost'
const targetPort = process.env.TARGET_PORT || 3001
const listenPort = process.env.LISTEN_PORT || 3000

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  console.error('Certificate files not found in certs/. Run mkcert to generate them.')
  process.exit(1)
}

const cert = fs.readFileSync(CERT_FILE)
const key = fs.readFileSync(KEY_FILE)

const proxy = httpProxy.createProxyServer({
  target: { host: targetHost, port: targetPort },
  xfwd: true,
  ws: true
})

proxy.on('error', (err, req, res) => {
  console.error('Proxy error', err)
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad gateway')
  }
})

const server = https.createServer({ key, cert }, (req, res) => {
  proxy.web(req, res)
})

// upgrade for websocket
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head)
})

server.listen(listenPort, () => {
  console.log(`HTTPS proxy listening on https://localhost:${listenPort} -> http://${targetHost}:${targetPort}`)
})
