import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/options'

export default async function PaymentMethodsPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return <div className="p-6">ログインしてください。</div>
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">支払い方法</h1>
        <p className="mt-4 text-gray-600">支払い方法の管理（プレースホルダ）。</p>
      </div>
    </div>
  )
}
