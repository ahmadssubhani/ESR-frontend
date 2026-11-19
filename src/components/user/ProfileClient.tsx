'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'
import { createClient } from '@/lib/supabase/client'
import { endDemoSession, getDemoRole, subscribeToDemoRole } from '@/lib/demo-session'
import type { Review, UserCoupon } from '@/types/database'

type Related<T> = T | T[] | null

type ProfileReview = Pick<Review, 'id' | 'created_at' | 'comment' | 'rating_overall'> & {
  rating?: number | null
  review_text?: string | null
  restaurants?: Related<{ name: string | null }>
}

type ProfileRedemption = Pick<UserCoupon, 'id' | 'used_at'> & {
  created_at?: string | null
  status?: string | null
  offers?: Related<{
    name: string | null
    restaurants?: Related<{ name: string | null }>
  }>
}

interface ProfileProps {
  profile: {
    id: string
    full_name?: string
    phone?: string
    email?: string
    role?: string
    image_url?: string
  } | null
  reviews: ProfileReview[]
  redemptions: ProfileRedemption[]
  demoMode?: boolean
}

export default function ProfileClient({ profile, demoMode = false }: ProfileProps) {
  const router = useRouter()
  const demoRole = useSyncExternalStore(subscribeToDemoRole, getDemoRole, () => null)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const isSignOutNavigation = useRef(false)

  useEffect(() => {
    if (demoMode && !demoRole && !isSignOutNavigation.current) {
      router.replace('/auth/login?next=%2Fuser%2Fprofile')
    }
  }, [demoMode, demoRole, router])

  async function handleSignOut() {
    isSignOutNavigation.current = true
    setIsSigningOut(true)
    try {
      if (demoMode) {
        endDemoSession()
      } else {
        const { error } = await createClient().auth.signOut()
        if (error) throw error
      }

      localStorage.removeItem('user_name')
      localStorage.removeItem('user_phone')
      localStorage.removeItem('user_avatar')
      window.dispatchEvent(new Event('user-avatar-changed'))
      router.replace('/user/offers')
      router.refresh()
    } catch (error) {
      isSignOutNavigation.current = false
      setIsSigningOut(false)
      const message = error instanceof Error ? error.message : 'Could not sign out. Please try again.'
      toast.error(message)
    }
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      if (demoMode) {
        localStorage.setItem('user_name', fullName)
        localStorage.setItem('user_phone', phone)
        setSaveSuccess(true)
        toast.success('Profile updated')
        return
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          image_url: profile?.image_url || null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Failed to update profile')

      localStorage.setItem('user_name', fullName)
      localStorage.setItem('user_phone', phone)
      window.dispatchEvent(new Event('user-avatar-changed'))
      setSaveSuccess(true)
      toast.success('Profile updated')
      router.refresh()
    } catch (error) {
      console.error('Error updating profile:', error)
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      setSaveError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (demoMode && !demoRole) {
    return (
      <p role="status" className="py-12 text-center text-base font-medium text-[var(--plum)]">
        {isSigningOut ? 'Signing out…' : 'Redirecting to sign in…'}
      </p>
    )
  }

  const roleLabel = profile?.role === 'customer' || demoMode ? 'user' : profile?.role || 'user'

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[var(--background)] px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-[870px]">
        <header className="mb-7 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--crimson)]">
              Your ESR account
            </p>
            <h1 className="esr-serif mt-2 text-3xl font-semibold text-[var(--plum)] sm:text-[30px]">
              Welcome, {fullName || 'Foodie'}.
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-5 text-sm font-medium text-[var(--plum)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <section aria-label="Profile details" className="esr-card p-5 sm:p-6">
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-full-name" className="mb-2 block text-sm font-medium text-[var(--muted)]">
                Full name
              </label>
              <input
                id="profile-full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="esr-auth-input min-h-11 w-full rounded-lg px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-[var(--muted)]">
                Mobile
              </label>
              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+92 300 1234567"
                className="esr-auth-input min-h-11 w-full rounded-lg px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-[var(--muted)]">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile?.email || ''}
                readOnly
                aria-readonly="true"
                className="esr-auth-input min-h-11 w-full rounded-lg px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-role" className="mb-2 block text-sm font-medium text-[var(--muted)]">
                Role
              </label>
              <input
                id="profile-role"
                type="text"
                value={roleLabel}
                readOnly
                aria-readonly="true"
                className="esr-auth-input min-h-11 w-full rounded-lg px-3 text-sm"
              />
            </div>

            {saveError && (
              <p role="alert" className="col-span-full flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--plum)]">
                <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--crimson)]" size={17} />
                <span>Error: {saveError}</span>
              </p>
            )}
            <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {saveSuccess ? 'Profile updated' : ''}
            </p>
            <div className="col-span-full pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="esr-primary-button inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <ButtonLoader label="Saving…" /> : 'Save profile'}
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="dining-activity-heading" className="esr-card mt-4 p-6 sm:px-6 sm:py-10">
          <h2 id="dining-activity-heading" className="esr-serif text-2xl font-semibold text-[var(--plum)]">
            Your dining activity
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/user/reviews"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--plum)] hover:bg-[var(--surface-muted)]"
            >
              My reviews <ArrowRight aria-hidden="true" size={15} />
            </Link>
            <Link
              href="/user/favourites"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--plum)] hover:bg-[var(--surface-muted)]"
            >
              My discounts <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
