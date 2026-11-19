'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import { ArrowUpRight, BarChart3, ClipboardList, LayoutDashboard, Store, Users } from 'lucide-react'
import { getDemoRole, startDemoSession, subscribeToDemoRole } from '@/lib/demo-session'

const demoMetrics = [
  { label: 'Active restaurants', value: '48', change: '+6 this month', icon: Store },
  { label: 'Active offers', value: '126', change: 'Across 8 cities', icon: ClipboardList },
  { label: 'Voucher redemptions', value: '842', change: '+12% this week', icon: BarChart3 },
  { label: 'Community members', value: '5.2k', change: 'Growing every week', icon: Users },
]

const previewRows = [
  { name: 'Karachi Karahi House', city: 'Karachi', category: 'Pakistani', discount: '25% off', status: 'Active' },
  { name: 'Bun Kabab Social', city: 'Karachi', category: 'Burgers', discount: '20% off', status: 'Active' },
  { name: 'Lahori Dastarkhwan', city: 'Lahore', category: 'Pakistani', discount: '30% off', status: 'Pending' },
]

export default function DemoWorkspacePage() {
  const savedRole = useSyncExternalStore(subscribeToDemoRole, getDemoRole, () => null)
  const [selectedSection, setSelectedSection] = useState('Overview')
  const role = savedRole === 'Admin' || savedRole === 'Restaurant' ? savedRole : 'Admin'
  const isRestaurant = role === 'Restaurant'

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="esr-card h-fit p-4">
          <div className="mb-5 flex items-center gap-3 px-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--crimson)]">
              <LayoutDashboard aria-hidden="true" size={22} />
            </span>
            <div>
              <p className="esr-serif font-bold">ESR workspace</p>
              <p className="text-sm text-[var(--muted)]">{role} workspace</p>
            </div>
          </div>
          <nav aria-label="Workspace sections" className="space-y-1">
            {['Overview', isRestaurant ? 'My offers' : 'Restaurants', 'Vouchers', 'Insights'].map((section) => (
              <button
                key={section}
                type="button"
                aria-pressed={selectedSection === section}
                onClick={() => setSelectedSection(section)}
                className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold ${
                  selectedSection === section
                    ? 'bg-[var(--plum)] text-white'
                    : 'text-[var(--plum)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                {section}
              </button>
            ))}
          </nav>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="px-2 text-sm font-semibold text-[var(--muted)]">Switch workspace role</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['Admin', 'Restaurant'] as const).map((nextRole) => (
                <button
                  key={nextRole}
                  type="button"
                  aria-pressed={role === nextRole}
                  onClick={() => startDemoSession(nextRole)}
                  className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${
                    role === nextRole
                      ? 'border-[var(--plum)] bg-[var(--plum)] text-white'
                      : 'border-[var(--border)] text-[var(--plum)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {nextRole}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="esr-eyebrow">Workspace overview</p>
              <h1 className="mt-2 text-4xl font-bold">{selectedSection}</h1>
              <p className="mt-2 text-base text-[var(--muted)]">
                Example {isRestaurant ? 'restaurant' : 'business'} information from ESR.
              </p>
            </div>
            <Link href="/user/offers" className="esr-primary-button inline-flex min-h-11 items-center gap-2 px-4">
              View diner experience <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </header>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--plum)]">
            Workspace information is illustrative and changes are not saved to a restaurant account.
          </div>

          <section aria-label="Business metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {demoMetrics.map(({ label, value, change, icon: Icon }) => (
              <article key={label} className="esr-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
                  <Icon aria-hidden="true" className="text-[var(--crimson)]" size={20} />
                </div>
                <p className="esr-serif mt-3 text-3xl font-bold">{value}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{change}</p>
              </article>
            ))}
          </section>

          <section className="esr-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <div>
                <h2 className="esr-serif text-xl font-bold">{isRestaurant ? 'Your latest offers' : 'Restaurant offers'}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Selected offers from the ESR dining catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSection(isRestaurant ? 'My offers' : 'Restaurants')}
                className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--plum)] hover:bg-[var(--surface-muted)]"
              >
                {isRestaurant ? 'Manage offers' : 'Browse restaurants'}
              </button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {previewRows.map((row, index) => (
                <div key={row.name} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                    <Image
                      src={[
                        'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=160&q=80',
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80',
                        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=160&q=80',
                      ][index]}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--plum)]">{row.name}</p>
                    <p className="text-sm text-[var(--muted)]">{row.category} · {row.city}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-bold text-[var(--plum)]">{row.discount}</span>
                  <span className="min-w-16 text-right text-sm font-semibold text-[var(--muted)]">{row.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
