import Link from 'next/link'

type Props = {
  params: { id: string }
}

export default async function ProducerPage({ params }: Props) {
  const { id } = params

  // TODO: fetch producer data from API or prisma
  // For now render a placeholder
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => history.back()} className="mb-4 text-gray-600">← 戻る</button>
        <h1 className="text-3xl font-bold mb-4">生産者情報</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-medium">生産者 ID: {id}</h2>
          <p className="mt-2 text-gray-700">生産者の詳細情報をここに表示します。</p>
          <div className="mt-4">
            <Link href="/shop/products?producerId=" className="text-green-600 hover:underline">この生産者の商品一覧へ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
