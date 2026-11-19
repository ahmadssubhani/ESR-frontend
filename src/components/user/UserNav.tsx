'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, MessageSquare, Tag, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profile: {
    full_name: string | null
    image_url?: string | null
    avatar_url?: string | null
    role: string
  } | null
}

interface Notification {
  id: string
  type: 'voucher' | 'like' | 'comment'
  entity_id: string | null
  created_at: string
  read_at: string | null
  actor: { full_name: string | null } | null
}

function notificationMessage(notification: Notification) {
  if (notification.type === 'voucher') return 'A discount is ready in your account history.'
  const actor = notification.actor?.full_name || 'A diner'
  return notification.type === 'like' ? `${actor} liked your post.` : `${actor} commented on your post.`
}

export default function UserNav({ profile: initialProfile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsError, setNotificationsError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const isSignedIn = Boolean(userId)
  const unreadCount = notifications.filter((notification) => !notification.read_at).length
  const userName = profile?.full_name?.trim().split(/\s+/)[0] || 'Account'
  const avatarUrl = profile?.avatar_url || profile?.image_url || null
  const isDiscover = pathname === '/user/offers'
  const isFeed = pathname.startsWith('/user/foodies-feed')

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function loadProfile(id: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, image_url, avatar_url, role')
        .eq('id', id)
        .maybeSingle()
      if (!active) return
      if (error) {
        console.error('Could not load account profile for navigation:', error)
        return
      }
      if (data) setProfile(data)
    }

    function applySession(session: { user: { id: string } } | null) {
      if (!active) return
      const id = session?.user.id || null
      setUserId(id)
      setAuthLoading(false)
      if (id) window.setTimeout(() => void loadProfile(id), 0)
      else setProfile(null)
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Could not read the current sign-in session:', error)
      applySession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setNotificationsError('')
      return
    }
    let active = true
    fetch('/api/notifications')
      .then(async (response) => {
        const data: unknown = await response.json()
        if (!response.ok) {
          const message =
            data && typeof data === 'object' && 'error' in data
              ? String(data.error)
              : 'Notifications could not be loaded.'
          throw new Error(message)
        }
        if (active && Array.isArray(data)) setNotifications(data as Notification[])
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error('Could not load notifications:', error)
        setNotificationsError('Notifications could not be loaded right now.')
      })
    return () => {
      active = false
    }
  }, [userId])

  async function markAsRead(notification: Notification) {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notification.id }),
    })
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? String(payload.error)
          : 'This notification could not be updated.'
      setNotificationsError(message)
      return
    }
    setNotifications((current) =>
      current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)
    )
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Could not sign out:', error)
      setNotificationsError('Sign out failed. Please try again.')
      setSigningOut(false)
      return
    }
    setUserId(null)
    setProfile(null)
    router.push('/user/offers#discover')
    router.refresh()
    setSigningOut(false)
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 lg:gap-8">
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
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {authLoading ? (
              <span aria-label="Checking account" className="h-11 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            ) : isSignedIn ? (
              <>
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
                            Updates about your vouchers and posts.
                          </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            aria-label="Close notifications"
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--plum)] hover:bg-[var(--surface-soft)]"
                          >
                            <X aria-hidden="true" size={20} />
                          </button>
                        </Dialog.Close>
                      </div>
                      {notificationsError && <p role="status" className="mb-3 text-sm text-[var(--crimson)]">{notificationsError}</p>}
                      {notifications.length === 0 ? (
                        <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--plum)]">
                          You&apos;re all caught up.
                        </p>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {notifications.map((notification) => {
                            const href = notification.type === 'voucher'
                              ? '/user/profile?tab=history'
                              : `/user/foodies-feed#post/${notification.entity_id || ''}`
                            return (
                              <li key={notification.id} className="flex items-start justify-between gap-4 py-4">
                                <div className="flex min-w-0 gap-3">
                                  {!notification.read_at && (
                                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--crimson)]" aria-hidden="true" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold capitalize text-[var(--plum)]">{notification.type}</p>
                                    <Link
                                      href={href}
                                      className="mt-1 inline-block min-h-11 py-2 text-sm text-[var(--crimson)] underline-offset-2 hover:underline"
                                    >
                                      {notificationMessage(notification)}
                                    </Link>
                                    <time className="block text-sm text-[var(--muted)]" dateTime={notification.created_at}>
                                      {new Date(notification.created_at).toLocaleDateString('en-PK')}
                                    </time>
                                  </div>
                                </div>
                                {!notification.read_at && (
                                  <button
                                    type="button"
                                    onClick={() => void markAsRead(notification)}
                                    className="min-h-11 shrink-0 rounded-lg px-2 text-left text-sm font-semibold text-[var(--crimson)] underline-offset-2 hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
                <Link
                  href="/user/profile"
                  aria-label={`Account: ${userName}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--crimson)] px-2.5 text-sm font-bold text-white hover:bg-[var(--crimson-hover)] sm:px-3"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" />
                    ) : (
                      <span aria-hidden="true" className="text-sm">{userName.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="max-w-20 truncate sm:max-w-36">{userName}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  aria-label="Sign out"
                  className="hidden h-11 w-11 items-center justify-center rounded-full text-[var(--plum)] hover:bg-white md:inline-flex"
                >
                  <LogOut aria-hidden="true" size={18} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--plum)] hover:bg-white md:inline-flex"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="hidden min-h-11 items-center rounded-full bg-[var(--crimson)] px-4 text-sm font-semibold text-white hover:bg-[var(--crimson-hover)] md:inline-flex"
                >
                  Sign up
                </Link>
              </>
            )}

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
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
              {isSignedIn ? (
                <>
                  <Link
                    href="/user/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-[var(--plum)] hover:bg-white"
                  >
                    <User aria-hidden="true" size={18} /> Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    disabled={signingOut}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-semibold text-[var(--crimson)] hover:bg-white"
                  >
                    <LogOut aria-hidden="true" size={18} /> Sign out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--plum)]"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--crimson)] px-4 text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  )
}
