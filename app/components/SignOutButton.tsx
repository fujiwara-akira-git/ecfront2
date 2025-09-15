'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface SignOutButtonProps {
  className?: string
  children: React.ReactNode
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      // NextAuthのリダイレクト機能を無効にし、手動でリダイレクト
      await signOut({ redirect: false })
      
      // 明示的にショップページにリダイレクト
      router.push('/shop')
      router.refresh()
    } catch (error) {
      console.error('サインアウトエラー:', error)
      // エラーが発生した場合も、ショップページにリダイレクト
      router.push('/shop')
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className={className}
      type="button"
    >
      {children}
    </button>
  )
}