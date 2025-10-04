#!/usr/bin/env node
const fs = require('fs')
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const { URL } = require('url')

function usage() {
  console.error('Usage: node replay_with_resign.js --payload-file payload.json --webhook-secret <secret> --webhook-url <url> [--timestamp <unix_ts>]')
  process.exit(2)
}

const argv = require('minimist')(process.argv.slice(2))
const payloadFile = argv['payload-file'] || argv.p
const webhookSecret = argv['webhook-secret'] || argv.s
const webhookUrl = argv['webhook-url'] || argv.u
let timestamp = argv['timestamp'] || argv.t

if (!payloadFile || !webhookSecret || !webhookUrl) usage()

let rawBody
try {
  rawBody = fs.readFileSync(payloadFile, 'utf8')
} catch (e) {
  console.error('Failed to read payload file:', e.message)
  process.exit(3)
}

if (!timestamp) timestamp = Math.floor(Date.now() / 1000).toString()

const toSign = `${timestamp}.${rawBody}`
const sig = crypto.createHmac('sha256', String(webhookSecret)).update(toSign).digest('hex')
const header = `t=${timestamp},v1=${sig}`

console.log('Signing with timestamp:', timestamp)
console.log('Stripe-Signature header:', header)

const url = new URL(webhookUrl)
const opts = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + (url.search || ''),
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(rawBody),
    'Stripe-Signature': header,
    'User-Agent': 'replay-with-resign/1.0'
  }
}

const client = url.protocol === 'https:' ? https : http

const req = client.request(opts, (res) => {
  let out = ''
  res.setEncoding('utf8')
  res.on('data', (chunk) => out += chunk)
  res.on('end', () => {
    console.log('Response status:', res.statusCode)
    console.log('Response headers:', res.headers)
    console.log('Response body:')
    console.log(out)
  })
})

req.on('error', (err) => {
  console.error('Request error:', err)
})

req.write(rawBody)
req.end()
