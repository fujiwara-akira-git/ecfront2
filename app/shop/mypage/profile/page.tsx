import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/options'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold">プロフィール</h1>
          <p className="mt-4 text-gray-600">ログインするとプロフィールを編集できます。</p>
          <div className="mt-4"><Link href="/shop/auth/signin" className="text-emerald-600">ログイン</Link></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">プロフィール</h1>
        <p className="mt-2 text-gray-700">名前: {session.user.name}</p>
        <p className="mt-1 text-gray-700">メール: {session.user.email}</p>
        <div className="mt-4">
          <Link href="/shop/mypage" className="text-emerald-600">マイページに戻る</Link>
        </div>
      </div>
    </div>
  )
}
