import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        let { email } = credentials
        const { password } = credentials
        // 正規化: 登録時と同じルールで比較する
        if (typeof email === 'string') {
          email = email.trim().toLowerCase()
        }

        try {
          // 部分的に環境をログ（秘密は出さない）
          console.log('[auth][authorize] env', {
            NEXTAUTH_URL: process.env.NEXTAUTH_URL ? String(process.env.NEXTAUTH_URL).slice(0, 40) : undefined,
            DATABASE_URL: process.env.DATABASE_URL ? String(process.env.DATABASE_URL).slice(0, 40) : undefined,
          })

          // データベースからユーザーを検索
          console.log('[auth][authorize] querying user by email', { email })
          const user = await prisma.user.findUnique({ where: { email } })

          console.log('[auth][authorize] lookup', { email, found: !!user, userId: user?.id ?? null, hasPassword: !!user?.password })

          if (!user || !user.password) {
            console.log('[auth][authorize] no user or no password hash, denying auth', { email })
            return null
          }

          // パスワードを検証
          console.log('[auth][authorize] comparing password for user', { userId: user.id })
          const isValidPassword = await bcryptjs.compare(password, user.password)
          console.log('[auth][authorize] password compare result', { userId: user.id, isValidPassword })

          if (!isValidPassword) {
            console.log('[auth][authorize] invalid password, denying auth', { userId: user.id })
            return null
          }

          // データベースのuserTypeフィールドに基づいてロールを決定
          const role = (user.userType || 'customer').toUpperCase()

          // NextAuth の user オブジェクトとして返す形を明示
          return {
            id: user.id,
            email: user.email ?? undefined,
            name: user.name || 'Unknown User',
            role,
          }
        } catch (error) {
          const e: any = error
          console.error('認証エラー:', e?.message || e)
          if (e?.stack) console.error(e.stack)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/shop/auth/signin',
    signOut: '/',
    error: '/shop/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      // token を拡張して role を保持する
      const extended = token as JWT & { role?: string }
      if (user && 'role' in user) {
        extended.role = (user as { role?: string }).role
      }
      return extended
    },
    async session({ session, token }) {
      // session.user に id と role を安全に付与して返す
      const extendedToken = token as JWT & { role?: string }
      if (session?.user) {
        const userWithExtras = {
          ...session.user,
          id: token.sub ?? undefined,
          role: extendedToken.role ?? undefined,
        }
        return { ...session, user: userWithExtras }
      }
      return session
    }
  }
}
