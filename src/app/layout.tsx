// import type { Metadata } from 'next'
// import { Suspense } from 'react'
// import { Geist, Geist_Mono } from 'next/font/google'
// import './globals.css'
// import UserNav from '@/components/user/UserNav'
// import SiteFooter from '@/components/SiteFooter'
// import { createClient } from '@/lib/supabase/server'

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// })

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// })

// export const metadata: Metadata = {
//   title: 'ESR – Discover Restaurant Deals',
//   description: 'Find exclusive discounts at top restaurants near you.',
// }

// export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
//   let profile = null
//   try {
//     const supabase = await createClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (user) {
//       const { data } = await supabase.from('profiles').select('full_name, image_url, role').eq('id', user.id).single()
//       profile = data
//     }
//   } catch {
//     // ignore server-side auth errors and render nav without profile
//     profile = null
//   }

//   return (
//     <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
//       <body className="min-h-full flex flex-col">
//         <Suspense fallback={<div className="h-16 border-b border-red-100 bg-white" />}>
//           <UserNav profile={profile} />
//         </Suspense>
//         <main className="flex-1">{children}</main>
//         <SiteFooter />
//       </body>
//     </html>
//   )
// }
import type { Metadata } from 'next'
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <RouteAccessibility />
        <Suspense fallback={<div className="h-16 border-b border-red-100 bg-white" />}>
          <UserNav profile={null} />
        </Suspense>
        <div id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  )
}