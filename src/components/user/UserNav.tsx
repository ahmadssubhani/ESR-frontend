'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Bell, ExternalLink, Heart, LogOut, Menu, MessageSquare, Tag, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { endDemoSession, getDemoRole, subscribeToDemoRole } from '@/lib/demo-session'

interface Props {
  profile: {
    full_name: string | null
    image_url?: string | null
    avatar_url?: string | null
    role: string
  } | null
}

const initialNotifications = [
  {
    id: 'voucher-ready',
    restaurant: 'Karachi Karahi House',
    message: 'Your 25% voucher is ready to show.',
    read: false,
  },
  {
    id: 'voucher-verified',
    restaurant: 'Bun Kabab Social',
    message: 'Your discount was verified. You saved PKR 840.',
    read: false,
  },
  {
    id: 'voucher-expired',
    restaurant: 'Margalla Table',
    message: 'Your voucher has expired.',
    read: true,
  },
]

export default function UserNav({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
  const demoRole = useSyncExternalStore(subscribeToDemoRole, getDemoRole, () => null)
  const [signedOut, setSignedOut] = useState(false)
  const isSignedIn = (Boolean(profile) || Boolean(demoRole)) && !signedOut
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState(profile?.full_name || 'Diner')
  const [savedCount, setSavedCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    const updateUserData = () => {
      const localAvatar = localStorage.getItem('user_avatar')
      const localName = localStorage.getItem('user_name')
      const localSaved = localStorage.getItem('esr_saved_offers')

      setAvatarUrl(localAvatar || profile?.image_url || profile?.avatar_url || null)
      setUserName(localName || profile?.full_name || 'Account')

      if (localSaved) {
        try {
          const parsed: unknown = JSON.parse(localSaved)
          setSavedCount(Array.isArray(parsed) ? parsed.length : 0)
        } catch (error) {
          console.error('Could not read saved offers:', error)
          setSavedCount(0)
        }
      } else {
        setSavedCount(0)
      }
    }

    updateUserData()
    window.addEventListener('esr-saved-updated', updateUserData)
    window.addEventListener('user-avatar-changed', updateUserData)
    window.addEventListener('storage', updateUserData)

    return () => {
      window.removeEventListener('esr-saved-updated', updateUserData)
      window.removeEventListener('user-avatar-changed', updateUserData)
      window.removeEventListener('storage', updateUserData)
    }
  }, [profile])

  async function signOut() {
    if (demoRole) {
      endDemoSession()
      setSignedOut(true)
      setAvatarUrl(null)
      setUserName('Account')
      toast.success('Demo session ended')
      router.push('/auth/login')
      return
    }

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }

    localStorage.removeItem('user_avatar')
    localStorage.removeItem('user_name')
    setSignedOut(true)
    setAvatarUrl(null)
    setUserName('Account')
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const isDiscover = pathname === '/user/offers'
  const isFeed = pathname.startsWith('/user/foodies-feed')

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5 lg:gap-8">
            <Link href="/user/offers" className="group flex shrink-0 flex-col leading-none" aria-label="ESR Discover">
              <span className="esr-serif text-[1.7rem] font-bold tracking-tight">
                esr<span className="text-[var(--gold)]">.</span>
              </span>
              <span className="mt-1 text-[0.625rem] font-bold tracking-[0.13em] text-[var(--muted)]">
                EAT SLEEP REPEAT
              </span>
            </Link>

            <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
              <Link
                href="/user/offers"
                aria-current={isDiscover ? 'page' : undefined}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  isDiscover ? 'text-[var(--crimson)]' : 'text-[var(--plum)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                Discover
              </Link>
              <Link
                href="/user/foodies-feed"
                aria-current={isFeed ? 'page' : undefined}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  isFeed ? 'text-[var(--crimson)]' : 'text-[var(--plum)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                Foodie Feed
              </Link>
              {isSignedIn && (
                <Link
                  href="/user/favourites"
                  aria-label={`Saved offers${savedCount ? `, ${savedCount} saved` : ''}`}
                  aria-current={pathname.startsWith('/user/favourites') ? 'page' : undefined}
                  className="rounded-full p-2 text-[var(--plum)] hover:bg-[var(--surface-muted)]"
                >
                  <Heart aria-hidden="true" size={18} />
                </Link>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--plum)] hover:bg-white"
                >
                  <Bell aria-hidden="true" size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--crimson)] px-1 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--plum)]/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-5 shadow-2xl sm:p-7">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="esr-serif text-3xl font-bold">Notifications</Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">
                        Updates about your ESR vouchers and savings.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close notifications"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--plum)] hover:bg-[#f1dfdd]"
                      >
                        <X aria-hidden="true" size={20} />
                      </button>
                    </Dialog.Close>
                  </div>

                  <ul className="divide-y divide-[var(--border)]">
                    {notifications.map((notification) => (
                      <li key={notification.id} className="flex items-start justify-between gap-4 py-4">
                        <div className="flex min-w-0 gap-3">
                          {!notification.read && (
                            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--crimson)]" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--plum)]">{notification.restaurant}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">{notification.message}</p>
                            <span className="mt-2 inline-block rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                              Sample notification
                            </span>
                            {!notification.read && <span className="sr-only">Unread</span>}
                          </div>
                        </div>
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() =>
                              setNotifications((current) =>
                                current.map((item) =>
                                  item.id === notification.id ? { ...item, read: true } : item
                                )
                              )
                            }
                            className="min-h-11 shrink-0 rounded-lg px-2 text-left text-sm font-bold text-[var(--crimson)] underline-offset-2 hover:underline"
                          >
                            <span className="sr-only">Mark {notification.restaurant} notification </span>
                            Mark as read
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <a
              href="https://esrah.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--plum)] hover:border-[var(--crimson)] lg:inline-flex"
            >
              App preview <ExternalLink aria-hidden="true" size={14} />
              <span className="sr-only">(opens in new tab)</span>
            </a>
            <Link
              href={demoMode ? '/demo/workspace' : '/admin/dashboard'}
              className="hidden min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--plum)] hover:border-[var(--crimson)] lg:inline-flex"
            >
              Business workspace <ExternalLink aria-hidden="true" size={14} />
            </Link>

            {isSignedIn ? (
              <>
                <Link
                  href="/user/profile"
                  aria-label={`Account: ${userName}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--crimson)] px-3 text-sm font-bold text-white hover:bg-[var(--crimson-hover)]"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        fill
                        sizes="28px"
                        unoptimized={avatarUrl.startsWith('data:') || avatarUrl.includes('supabase.co')}
                        className="object-cover"
                      />
                    ) : (
                      <User aria-hidden="true" size={16} />
                    )}
                  </span>
                  <span className="hidden sm:inline">ESR · {demoRole || 'User'}</span>
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className="hidden h-11 w-11 items-center justify-center rounded-full text-[var(--plum)] hover:bg-white sm:inline-flex"
                >
                  <LogOut aria-hidden="true" size={18} />
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex min-h-11 items-center rounded-full bg-[var(--crimson)] px-4 text-sm font-bold text-white hover:bg-[var(--crimson-hover)]"
              >
                <span className="hidden sm:inline">Login / Account</span>
                <span className="sm:hidden">Login</span>
              </Link>
            )}

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--plum)] hover:bg-white md:hidden"
            >
              {mobileMenuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                href="/user/offers"
                aria-current={isDiscover ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
              >
                <Tag aria-hidden="true" size={18} /> Discover
              </Link>
              <Link
                href="/user/foodies-feed"
                aria-current={isFeed ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
              >
                <MessageSquare aria-hidden="true" size={18} /> Foodie Feed
              </Link>
              {isSignedIn && (
                <Link
                  href="/user/favourites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
                >
                  <Heart aria-hidden="true" size={18} /> Saved ({savedCount})
                </Link>
              )}
              <a
                href="https://esrah.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
              >
                <ExternalLink aria-hidden="true" size={18} /> App preview
                <span className="sr-only">(opens in new tab)</span>
              </a>
              <Link
                href={demoMode ? '/demo/workspace' : '/admin/dashboard'}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
              >
                <ExternalLink aria-hidden="true" size={18} /> Business workspace
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  )
}
