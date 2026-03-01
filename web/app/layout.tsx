import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { LangProvider } from '@/lib/LangContext'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['700', '900'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Jipange Na Kura — Plan Your Vote',
  description:
    'Find current leaders and 2027 candidates across all 47 counties, 290 constituencies and 1,450 wards.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable}`}>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
