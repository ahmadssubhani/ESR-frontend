'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, UtensilsCrossed, Tag, Ticket, Receipt, Star, Megaphone, Smartphone, Users, BarChart2, LogOut, ChevronLeft } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'restaurant'] },
  { href: '/admin/restaurants', label: 'Restaurants', icon: UtensilsCrossed, roles: ['admin', 'restaurant'] },
  { href: '/admin/offers', label: 'Offers', icon: Tag, roles: ['admin', 'restaurant'] },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket, roles: ['admin', 'restaurant'] },
  { href: '/admin/vouchers', label: 'Claimed Vouchers', icon: Receipt, roles: ['admin', 'restaurant'] },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, roles: ['admin', 'restaurant'] },
  { href: '/admin/ads', label: 'Ads', icon: Megaphone, roles: ['admin'] },
  { href: '/admin/app-version', label: 'App Version', icon: Smartphone, roles: ['admin'] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2, roles: ['admin', 'restaurant'] },
]

export default function AdminSidebar({ role }: { role: string; name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/user/offers#discover')
    router.refresh()
  }

  const items = NAV_ITEMS.filter(i => i.roles.includes(role))

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-red-600/80 backdrop-blur-md border-r border-white/20 flex flex-col transition-all duration-200 flex-shrink-0 min-h-screen text-white`}>
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/15">
        {!collapsed && <span className="text-lg font-black text-white">ESR Admin</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/70 hover:text-white transition-colors ml-auto">
          <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {items.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}>
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/15 space-y-1">
        <Link href="/user/offers" className={`flex items-center gap-3 px-3 py-2 rounded-xl text-white/75 hover:bg-white/10 text-sm transition-colors`}>
          <Tag size={16} />
          {!collapsed && 'User Panel'}
        </Link>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:bg-black/10 hover:text-white transition-colors">
          <LogOut size={16} />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
