const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main(){
  const email = process.env.TEST_EMAIL || 'test+autotest@example.com'
  const password = process.env.TEST_PASSWORD || 'password123'
  const existing = await prisma.user.findUnique({ where: { email } })
  if(existing){
    console.log('user exists', existing.id)
    process.exit(0)
  }
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name: 'Auto Test' } })
  console.log('created user', user.id)
}

main().catch(console.error).finally(()=>process.exit())
