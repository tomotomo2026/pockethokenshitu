import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'e:camo',
  description: '親御さんのための心理診断チャット',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
