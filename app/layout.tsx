import type { Metadata } from 'next'
import './globals.css'
import { Noto_Sans_JP } from 'next/font/google'
import { SessionProvider } from './components/SessionProvider'
import { ToastProvider } from './contexts/ToastContext'
import { CartProvider } from './contexts/CartContext'

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
  // Note: we fetch server session for SessionProvider initial value
  // Keep this layout client-safe by using dynamic rendering for session when needed.
  return (
    <html lang="ja">
      <body 
        className={`${noto.className} antialiased bg-gray-50 text-gray-900`} 
        suppressHydrationWarning={true}
      >
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

        <SessionProvider>
          <ToastProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
