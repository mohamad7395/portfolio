import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StarsBackground } from '@/components/ui/stars'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mohammad Akbari Monfared — AI/ML Engineer',
  description:
    'AI/ML Engineer with 4+ years shipping production AI — LLMs, RAG, and multi-agent systems.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.jpeg',
    apple: '/icon.jpeg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-black`}
    >
      <body className="font-sans antialiased bg-transparent">
        <StarsBackground className="fixed inset-0 -z-10 pointer-events-none" />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
