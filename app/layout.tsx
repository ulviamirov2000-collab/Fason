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
  title: 'FASON — İkinci əl geyim bazarı Azərbaycanda',
  description: 'Azərbaycanda ikinci əl geyim, ayaqqabı və aksesuar alqı-satqı platforması. Dolabını pula çevir.',
  keywords: 'ikinci əl geyim, used clothing azerbaijan, dolap azerbaycan, fason, ikinci əl ayaqqabı bakı',
  icons: { icon: '/fasonicon.png' },
  openGraph: {
    title: 'FASON — İkinci əl geyim bazarı',
    description: 'Dolabını pula çevir. Azərbaycanda ikinci əl geyim platforması.',
    url: 'https://fason-five.vercel.app',
    siteName: 'FASON',
    images: [{ url: '/fasonicon.png', width: 400, height: 400 }],
    locale: 'az_AZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FASON — İkinci əl geyim bazarı',
    description: 'Dolabını pula çevir.',
    images: ['/fasonicon.png'],
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
