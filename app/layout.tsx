import type { Metadata } from 'next'
import './globals.css'
import { Noto_Sans_JP } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Eagle Palace - 道の駅・農産物直売所向け統合プラットフォーム',
  description: '新鮮な農産物のオンラインショップと店舗管理システム',
}

const noto = Noto_Sans_JP({
  weight: ['400','500','600','700','900'],
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({ 
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body 
        className={`${noto.className} antialiased bg-gray-50 text-gray-900`} 
        suppressHydrationWarning={true}
      >
        {/* Remove attributes injected by browser extensions */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var attrs = ['data-new-gr-c-s-check-loaded','data-gr-ext-installed'];
              attrs.forEach(function(a){
                try { document.documentElement.removeAttribute(a); } catch(e){}
                try { if (document.body) document.body.removeAttribute(a); } catch(e){}
              });
            } catch(e) {}
          })();
        ` }} />
        
        {/* ルート専用のシンプルレイアウト */}
        {children}
      </body>
    </html>
  )
}
