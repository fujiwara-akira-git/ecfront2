#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  if (!email || !password) {
    console.error('Usage: node scripts/try-login.js <email> <password>')
    process.exit(2)
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log('NOT_FOUND', { email })
      process.exit(0)
    }
    console.log('FOUND', { id: user.id, email: user.email, hasPassword: !!user.password })
    if (!user.password) {
      console.log('NO_PASSWORD_HASH')
      process.exit(0)
    }
    const isValid = await bcrypt.compare(password, user.password)
    console.log('BCRYPT_COMPARE', { isValid })
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
