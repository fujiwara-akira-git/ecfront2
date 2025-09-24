#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, userType: true, createdAt: true }
    })
    console.log(JSON.stringify(users, null, 2))
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
