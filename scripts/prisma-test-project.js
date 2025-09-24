const { PrismaClient } = require('@prisma/client')
;(async () => {
  const p = new PrismaClient()
  try {
    const r = await p.$queryRaw`SELECT current_database() as db, current_user as user`
    console.log('OK', r)
  } catch (e) {
    console.error('ERR', e)
    process.exitCode = 1
  } finally {
    await p.$disconnect()
  }
})()
