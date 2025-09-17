import Link from 'next/link'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ProducersPage() {
  const producers = await prisma.producer.findMany({
    orderBy: { name: 'asc' },
    take: 100,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">生産者一覧</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {producers.map((p) => (
          <Link key={p.id} href={`/shop/producer/${p.id}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">写真</div>
              <div>
                <div className="text-lg font-medium">{p.name}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
