import HomeProducts from './components/HomeProducts'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50 relative overflow-hidden">
      {/* 管理画面リンクは非表示 */}

      {/* ヒーローセクション */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 inline-block">
            🌾 埼玉県産 新鮮野菜直売所 🌾
          </span>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-lime-600 bg-clip-text text-transparent mb-6">
            Eagle Palace
          </h1>
          
          <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-medium">
            農園直送の新鮮野菜をお届け
          </p>
          
          <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            朝採れの新鮮な野菜と果物を、農園から直接お客様の食卓へ。
            安心・安全で美味しい食材で、ご家族の笑顔と健康をサポートします。
          </p>
          
          {/* 特徴バッジ */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <span className="bg-white/80 backdrop-blur-sm text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-200">
              🌱 無農薬栽培
            </span>
            <span className="bg-white/80 backdrop-blur-sm text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-200">
              🚚 当日発送
            </span>
            <span className="bg-white/80 backdrop-blur-sm text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-200">
              🏆 産地直送
            </span>
          </div>
          
          {/* CTAボタン（矢印なしシンプル版） */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="/shop" 
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-green-500/25 transform hover:scale-105 transition-all flex items-center gap-3"
            >
              <span className="text-2xl">🛒</span>
              オンラインショップへ
            </a>
            <a 
              href="#about" 
              className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all flex items-center gap-3"
            >
              <span className="text-2xl">🌾</span>
              農園のこだわり
            </a>
          </div>
        </div>
      </section>

      {/* 農園のこだわりセクション */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
              🌾 ABOUT EAGLE PALACE
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">農園のこだわり</h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-4xl mx-auto">
              埼玉県の豊かな大地で、3代続く農家が心を込めて育てた野菜をお届けします。
              安心・安全で美味しい野菜作りへの想いと、お客様の健康と笑顔を願う気持ちを込めて。
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">無農薬栽培</h3>
              <p className="text-sm text-gray-600">化学農薬を使わず、自然の力で育てた安心の野菜です</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">朝採り当日発送</h3>
              <p className="text-sm text-gray-600">朝一番に収穫し、その日のうちに全国へお届けします</p>
            </div>
            
            <div className="text-center p-6 bg-yellow-50 rounded-2xl border border-yellow-100">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">産地直送</h3>
              <p className="text-sm text-gray-600">農園から直接お客様へ、中間業者を通さない新鮮さ</p>
            </div>
            
            <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-100">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">愛情たっぷり</h3>
              <p className="text-sm text-gray-600">一つ一つ手作業で、愛情を込めて丁寧に栽培</p>
            </div>
          </div>

          {/* 農園主からのメッセージ */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8 md:p-12 text-center">
            <div className="text-6xl mb-6">👨‍🌾</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">農園主からのメッセージ</h3>
            <p className="text-gray-700 leading-relaxed max-w-3xl mx-auto mb-6">
              「美味しい野菜は、健康な土作りから始まります。私たちは3代にわたって、この地で野菜を育ててきました。
              お客様に安心して召し上がっていただけるよう、今日も畑に出て、一つ一つの野菜と向き合っています。」
            </p>
            <p className="font-semibold text-green-700">Eagle Palace 農園主 田中 太郎</p>
          </div>
        </div>
      </section>

      {/* 季節の野菜セクション（Client Component） */}
      <HomeProducts />

      {/* 配送・サービス情報 */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">配送・サービス</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              新鮮な野菜を安心してお届けするための、充実した設備とサービス体制。
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl border border-blue-100">
              <div className="text-5xl mb-4">❄️</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">冷蔵配送</h3>
              <p className="text-gray-600">野菜の鮮度を保つ冷蔵車での配送で、最高の状態でお届けします。</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">丁寧梱包</h3>
              <p className="text-gray-600">一つ一つ丁寧に梱包し、配送中の品質劣化を防ぎます。</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-2xl border border-yellow-100">
              <div className="text-5xl mb-4">🚚</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">翌日配送</h3>
              <p className="text-gray-600">関東エリアは翌日配送可能。迅速にお客様の元へお届けします。</p>
            </div>
          </div>
        </div>
      </section>

      {/* アクセス情報 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
              📍 VISIT US
            </span>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">農園へのアクセス</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              埼玉県の緑豊かな環境で、直売所での対面販売も行っております。
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-3">
                <span className="text-3xl">🚃</span>
                電車でお越しの方
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-gray-800">JR高崎線 最寄り駅</p>
                  <p className="text-gray-600">東口より徒歩15分</p>
                  <p className="text-sm text-blue-600">※都心から約50分でアクセス良好</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="font-semibold text-gray-800">市内循環バス</p>
                  <p className="text-gray-600">「農園入口」バス停下車徒歩2分</p>
                  <p className="text-sm text-green-600">※1時間に1本運行</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-3">
                <span className="text-3xl">🚗</span>
                お車でお越しの方
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="font-semibold text-gray-800">圏央道最寄りIC</p>
                  <p className="text-gray-600">インターより車で約5分</p>
                  <p className="text-sm text-yellow-600">※都心からアクセス良好</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="font-semibold text-gray-800">駐車場完備</p>
                  <p className="text-gray-600">無料駐車場80台（大型車対応）</p>
                  <p className="text-sm text-purple-600">※電気自動車充電器も設置</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-2xl">
            <h3 className="text-2xl font-bold mb-6 text-center">🏪 Eagle Palace 農園直売所</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-3">📍 所在地</h4>
                <p>〒363-0000 埼玉県川田谷1234-5</p>
                <p className="text-sm opacity-90">（圏央道最寄りICより車で5分）</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">📞 お問い合わせ</h4>
                <p>TEL：048-123-4567</p>
                <p className="text-sm opacity-90">受付時間：9:00〜17:00</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-green-400">
              <h4 className="font-semibold mb-3">🕒 営業時間</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">直売所：毎日 9:00〜17:00</p>
                  <p className="text-sm opacity-90">※年中無休（年末年始除く）</p>
                </div>
                <div>
                  <p className="font-semibold">オンライン：24時間受付</p>
                  <p className="text-sm opacity-90">※朝採り野菜は午前中がおすすめ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-green-400">Eagle Palace</h3>
              <p className="text-gray-300">
                埼玉県の農園直売所。新鮮で安全な野菜を、農園から直接お客様へお届けします。
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">営業情報</h4>
              <ul className="space-y-2 text-gray-300">
                <li>直売所：9:00〜17:00</li>
                <li>オンライン：24時間受付</li>
                <li>定休日：年中無休</li>
                <li>TEL：048-123-4567</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">所在地</h4>
              <address className="text-gray-300 not-italic">
                〒363-0000<br />
                埼玉県川田谷1234-5<br />
                圏央道最寄りICより車で5分
              </address>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Eagle Palace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}