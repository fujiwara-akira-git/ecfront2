import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const nextAuthUrl = process.env.NEXTAUTH_URL ?? null
    const nextAuthSecretPresent = !!process.env.NEXTAUTH_SECRET
    const databaseUrlPresent = !!process.env.DATABASE_URL

    console.log('[vc-debug][env]', {
      hasNEXTAUTH_URL: !!nextAuthUrl,
  NEXTAUTH_URL_preview: nextAuthUrl ? nextAuthUrl.replace(/(:\/\/)([^/]+)(.*)/, '$1$2...') : null,
      hasNEXTAUTH_SECRET: nextAuthSecretPresent,
      hasDATABASE_URL: databaseUrlPresent
    })

    let userCount: number | null = null
    try {
      userCount = await prisma.user.count()
      console.log('[vc-debug][db] user count:', userCount)
    } catch (dbErr) {
      console.error('[vc-debug][db] error:', dbErr)
    }

    return NextResponse.json({
      ok: true,
      env: {
        hasNEXTAUTH_URL: !!nextAuthUrl,
        hasNEXTAUTH_SECRET: nextAuthSecretPresent,
        hasDATABASE_URL: databaseUrlPresent
      },
      dbUserCount: userCount
    })
  } catch (err) {
    console.error('[vc-debug][error]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
