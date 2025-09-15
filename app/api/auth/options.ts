import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
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

        const { email, password } = credentials

        try {
          // データベースからユーザーを検索
          const user = await prisma.user.findUnique({
            where: { 
              email
            }
          }) as any

          if (!user || !user.password) {
            return null
          }

          // パスワードを検証
          const isValidPassword = await bcryptjs.compare(password, user.password)

          if (!isValidPassword) {
            return null
          }

          // データベースのuserTypeフィールドに基づいてロールを決定
          const role = user.userType.toUpperCase()

          return {
            id: user.id,
            email: user.email!,
            name: user.name || 'Unknown User',
            role: role
          }
        } catch (error) {
          console.error('認証エラー:', error)
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
      if (user && 'role' in user) {
        const t = token as any
        t.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session?.user) {
        const s = session.user as any
        s.id = token.sub!
        s.role = (token as any).role as string
      }
      return session
    }
  }
}
