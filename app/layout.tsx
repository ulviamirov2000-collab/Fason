import type { Metadata } from 'next'
import { Space_Grotesk, Unbounded } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { Analytics } from '@vercel/analytics/react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FASON — İkinci əl geyim bazarı',
  description: "Dolabını pula çevir. Azerbaijan's second-hand clothing marketplace.",
  icons: {
    icon: '/fasonicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az" className={`${spaceGrotesk.variable} ${unbounded.variable}`}>
      <body
        className="min-h-screen"
        style={{ backgroundColor: '#FAF7F2', fontFamily: 'var(--font-space-grotesk), sans-serif' }}
      >
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
