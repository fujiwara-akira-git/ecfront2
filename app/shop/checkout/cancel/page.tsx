export default function CheckoutCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          決済がキャンセルされました
        </h1>
        
        <p className="text-gray-600 mb-6">
          決済処理が中断されました。カート内の商品はそのまま残っています。
        </p>
        
        <div className="space-y-3">
          <a 
            href="/shop/cart" 
            className="block w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            カートに戻る
          </a>
          
          <a 
            href="/shop" 
            className="block w-full text-emerald-600 py-2 font-medium hover:text-emerald-700 transition-colors"
          >
            ショップホームに戻る
          </a>
        </div>
      </div>
    </div>
  )
}