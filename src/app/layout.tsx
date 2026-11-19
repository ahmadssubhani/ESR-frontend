import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import UserNav from '@/components/user/UserNav'
import SiteFooter from '@/components/SiteFooter'
import { Toaster } from '@/components/ui/sonner'
import RouteAccessibility from '@/components/RouteAccessibility'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ESR – Discover Restaurant Deals',
  description: 'Find exclusive discounts at top restaurants near you.',
}

export const viewport: Viewport = {
  themeColor: '#FFF6F4',
  colorScheme: 'light',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <RouteAccessibility />
        <Suspense fallback={<div className="h-16 border-b border-[var(--border)] bg-[var(--surface)]" />}>
          <UserNav profile={null} />
        </Suspense>
        <div id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  )
}
