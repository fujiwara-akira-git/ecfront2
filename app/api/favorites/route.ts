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

    // validate producer exists to avoid FK violations
    const producer = await prisma.producer.findUnique({ where: { id: producerId } })
    if (!producer) return NextResponse.json({ error: 'producer not found' }, { status: 404 })

    const fav = await prisma.favoriteProducer.upsert({
      where: { userId_producerId: { userId, producerId } },
      update: {},
      create: { userId, producerId }
    })
    return NextResponse.json({ ok: true, favorite: fav })
  } catch (err) {
    console.error('favorites POST error', err)
  // handle Prisma foreign key error more clearly
  // @ts-expect-error - err may be any, check for Prisma error code
  if (err && err.code === 'P2003') return NextResponse.json({ error: 'foreign key violation' }, { status: 400 })
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
