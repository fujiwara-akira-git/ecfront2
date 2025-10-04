#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node scripts/check-user.js <email>')
    process.exit(2)
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log('NOT_FOUND', { email })
    } else {
      console.log('FOUND', {
        id: user.id,
        email: user.email,
        hasPassword: !!user.password,
        passwordPreview: user.password ? (user.password.slice(0,6) + '...') : null,
        userType: user.userType || null
      })
    }
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
