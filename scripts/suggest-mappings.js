#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function simpleScore(a,b){
  if(!a||!b) return 0
  a=a.toLowerCase(); b=b.toLowerCase()
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  const common = aWords.filter(w=>bWords.includes(w)).length
  const lenDiff = Math.abs(a.length - b.length)
  return common * 10 - lenDiff
}

async function main(){
  const placeholders = await prisma.product.findMany({ where: { description: { contains: 'imported_from_stripe' } }, orderBy: { createdAt: 'desc' }, take: 200 })
  if(placeholders.length===0){ console.log('No placeholders'); process.exit(0) }
  const products = await prisma.product.findMany({ where: { NOT: { description: { contains: 'imported_from_stripe' } } }, take: 5000 })
  for(const ph of placeholders){
    console.log('\nPlaceholder:', ph.id, ph.name, 'price:', ph.price)
    const candidates = products.map(p=>({ id:p.id, name:p.name, price:p.price, score: simpleScore(ph.name, p.name) + (ph.price===p.price?20:0) }))
    candidates.sort((a,b)=>b.score-a.score)
    candidates.slice(0,10).forEach(c=>console.log('  candidate:', c.id, c.name, 'price:', c.price, 'score', c.score))
  }
  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
