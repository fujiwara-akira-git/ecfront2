'use client'

import { useState } from 'react'

interface Producer {
  id: string
  name: string
  phone: string
  email: string
}

export default function ContactPage() {
  const [message, setMessage] = useState('')
  const [selectedProducers, setSelectedProducers] = useState<string[]>([])
  const [sendMethod, setSendMethod] = useState<'email' | 'sms'>('email')
  const [isSending, setIsSending] = useState(false)

  const producers: Producer[] = [
    { id: '1', name: '山田農園', phone: '090-1234-5678', email: 'yamada@example.com' },
    { id: '2', name: '鈴木果樹園', phone: '090-2345-6789', email: 'suzuki@example.com' },
    { id: '3', name: '佐藤野菜園', phone: '090-3456-7890', email: 'sato@example.com' },
  ]

  const toggleProducer = (id: string) =>
    setSelectedProducers(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const sendMessage = async () => {
    if (!message.trim() || selectedProducers.length === 0) {
      alert('メッセージと送信先を選択してください')
      return
    }
    setIsSending(true)
    await new Promise(r => setTimeout(r, 700))
    const names = producers.filter(p => selectedProducers.includes(p.id)).map(p => p.name).join(', ')
    alert(`${sendMethod === 'email' ? 'メール' : 'SMS'}で送信しました:\n\n${names}\n\n${message}`)
    setMessage('')
    setSelectedProducers([])
    setIsSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">生産者連絡</h1>
            <a href="/admin" className="text-blue-600 hover:text-blue-800">← 戻る</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white p-6 rounded shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">送信方法</label>
            <div className="flex gap-4 mt-2">
              <label className="inline-flex items-center">
                <input type="radio" name="m" checked={sendMethod === 'email'} onChange={() => setSendMethod('email')} className="mr-2" />
                メール
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="m" checked={sendMethod === 'sms'} onChange={() => setSendMethod('sms')} className="mr-2" />
                SMS
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">送信先</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {producers.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={selectedProducers.includes(p.id)} onChange={() => toggleProducer(p.id)} />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-600">{sendMethod === 'email' ? p.email : p.phone}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">メッセージ</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full p-2 border rounded mt-2" />
          </div>

          <div className="text-right">
            <button onClick={sendMessage} disabled={isSending} className="bg-blue-600 text-white px-4 py-2 rounded">
              {isSending ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
