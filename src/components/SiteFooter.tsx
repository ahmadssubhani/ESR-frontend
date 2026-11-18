'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const exploreLinks = [
  { href: '/user/offers', label: 'Offers' },
  { href: '/user/foodies-feed', label: 'Foodie Feed' },
  { href: '/user/offers?tab=esr-blog', label: 'ESR Bloggers' },
  { href: '/user/favourites', label: 'Saved' },
]

const companyLinks = [
  { href: '/services', label: 'B2B Services' },
  { href: '/charity', label: 'ESR Against Hunger' },
  { href: '/admin/dashboard', label: 'For Owners' },
  { href: '/auth/login', label: 'Sign In' },
]

export default function SiteFooter() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return null
  }

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface-muted)] pb-20 text-[var(--muted)] md:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-400 flex items-center justify-center text-white font-black text-lg shadow-md">
                E
              </div>
              <div className="flex flex-col">
                <span className="esr-serif text-xl font-bold tracking-tight leading-none">
                  esr<span className="text-[var(--gold)]">.</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  Eat Sleep Repeat
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-sm">
              Discover exclusive restaurant deals near you. Browse offers, redeem coupons, and eat better for less.
            </p>
          </div>

          <div>
            <h3 className="esr-serif mb-4 text-lg font-bold">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--crimson)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="esr-serif mb-4 text-lg font-bold">Company</h3>
            <ul className="space-y-2.5 text-sm">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[var(--crimson)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p>© {new Date().getFullYear()} ESR. All rights reserved.</p>
          <p>Founded in Pakistan · Since 2016</p>
        </div>
      </div>
    </footer>
  )
}
