export default function AdminHome() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">店舗スタッフ管理システム</h1>
            <nav className="space-x-4">
              <a href="/admin/pos" className="text-blue-600 hover:text-blue-800">POS</a>
              <a href="/admin/inventory" className="text-blue-600 hover:text-blue-800">在庫管理</a>
              <a href="/admin/sales" className="text-blue-600 hover:text-blue-800">売上確認</a>
              <a href="/admin/contact" className="text-blue-600 hover:text-blue-800">一斉連絡</a>
            </nav>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">POS機能</h3>
            <p className="text-gray-600 mb-4">商品選択・販売登録</p>
            <a href="/admin/pos" className="text-blue-600 hover:text-blue-800">アクセス →</a>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">在庫管理</h3>
            <p className="text-gray-600 mb-4">EC・店舗在庫一元管理</p>
            <a href="/admin/inventory" className="text-blue-600 hover:text-blue-800">アクセス →</a>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">売上確認</h3>
            <p className="text-gray-600 mb-4">日次売上一覧</p>
            <a href="/admin/sales" className="text-blue-600 hover:text-blue-800">アクセス →</a>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">一斉連絡</h3>
            <p className="text-gray-600 mb-4">生産者へのメッセージ送信</p>
            <a href="/admin/contact" className="text-blue-600 hover:text-blue-800">アクセス →</a>
          </div>
        </div>
      </div>
    </main>
  );
}
