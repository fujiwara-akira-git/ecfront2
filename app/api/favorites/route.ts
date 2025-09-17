import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/options'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const producerId = body?.producerId
  if (!producerId) return NextResponse.json({ error: 'producerId required' }, { status: 400 })

  try {
    const userId = session.user.id as string
    const fav = await prisma.favoriteProducer.upsert({
      where: { userId_producerId: { userId, producerId } },
      update: {},
      create: { userId, producerId }
    })
    return NextResponse.json({ ok: true, favorite: fav })
  } catch (err) {
    console.error('favorites POST error', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
