import Link from 'next/link'
export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">{children}</main>
      {/* Mobile bottom tabs */}
      <nav aria-label="Account navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white sm:hidden">
        <div className="flex">
          {[
            { href: '/user/offers', label: 'Offers', icon: '🏷️' },
            { href: '/user/popular', label: 'Popular', icon: '⭐' },
            { href: '/user/favourites', label: 'Saved', icon: '❤️' },
            { href: '/user/profile', label: 'Profile', icon: '👤' },
          ].map(tab => (
            <Link key={tab.href} href={tab.href} className="flex min-h-14 flex-1 flex-col items-center justify-center py-2 text-[var(--muted)] transition-colors hover:text-[var(--crimson)]">
              <span aria-hidden="true" className="text-xl">{tab.icon}</span>
              <span className="mt-0.5 text-sm font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
