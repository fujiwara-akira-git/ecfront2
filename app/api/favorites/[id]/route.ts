import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/options'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { id: producerId } = await params
    if (!producerId) return NextResponse.json({ error: 'producer id required' }, { status: 400 })

    await prisma.favoriteProducer.deleteMany({ where: { userId: session.user.id, producerId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('favorites DELETE error', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
