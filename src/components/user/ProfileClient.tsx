'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, Mail, Shield, Star, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

type ProfileReview = {
  id: string
  created_at: string
  rating_overall: number | null
  comment: string | null
  user_id: string | null
  restaurants: { name: string | null } | null
}

type Redemption = {
  id: string
  used_at: string
  offers: { name: string | null; restaurants: { name: string | null } | null } | null
}

type RestaurantView = {
  id: number
  viewed_at: string
  restaurants: { name: string | null; city: string | null } | null
}

type Tab = 'profile' | 'reviews' | 'history'

interface ProfileProps {
  profile: {
    id: string
    full_name: string
    phone: string
    email: string
    avatar_url: string | null
    emailConfirmed: boolean
  }
  reviews: ProfileReview[]
  redemptions: Redemption[]
  views: RestaurantView[]
  initialTab?: Tab
}

const AVATAR_LIMIT = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProfileClient({
  profile,
  reviews: initialReviews,
  redemptions,
  views,
  initialTab = 'profile',
}: ProfileProps) {
  const router = useRouter()
  const avatarInput = useRef<HTMLInputElement>(null)
  const pendingAvatar = useRef<File | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [reviews, setReviews] = useState(initialReviews)
  const [saving, setSaving] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [editingReview, setEditingReview] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editRating, setEditRating] = useState(5)

  function chooseAvatar(file: File | undefined) {
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_LIMIT) {
      setSaveError('Choose a JPG, PNG, WebP, or AVIF photo smaller than 2 MB.')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    const preview = URL.createObjectURL(file)
    pendingAvatar.current = file
    setAvatarPreview(preview)
    setAvatarUrl(preview)
    setSaveError('')
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveMessage('')
    try {
      const supabase = createClient()
      let nextAvatarUrl = profile.avatar_url
      const file = pendingAvatar.current
      if (file) {
        const extension = file.type.split('/')[1] || 'jpg'
        const path = `${profile.id}/${crypto.randomUUID()}.${extension}`
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (uploadError) throw new Error(uploadError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(uploaded.path)
        nextAvatarUrl = data.publicUrl
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim(), avatar_url: nextAvatarUrl }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          result && typeof result === 'object' && 'error' in result
            ? String(result.error)
            : 'Profile could not be updated.'
        throw new Error(message)
      }

      pendingAvatar.current = null
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      setAvatarUrl(nextAvatarUrl)
      setSaveMessage('Profile updated')
      toast.success('Profile updated')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile could not be updated.'
      setSaveError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSaveError(error.message)
      toast.error('Could not sign out. Please try again.')
      return
    }
    router.push('/user/offers#discover')
    router.refresh()
  }

  function startEdit(review: ProfileReview) {
    setEditingReview(review.id)
    setEditText(review.comment || '')
    setEditRating(Number(review.rating_overall) || 5)
  }

  async function saveReview(reviewId: string) {
    setReviewSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .update({ comment: editText.trim(), rating_overall: editRating })
        .eq('id', reviewId)
        .eq('user_id', profile.id)
      if (error) throw error
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? { ...review, comment: editText.trim(), rating_overall: editRating }
            : review
        )
      )
      setEditingReview(null)
      toast.success('Review updated')
    } catch (error) {
      console.error('Could not update review:', error)
      toast.error(error instanceof Error ? error.message : 'Review could not be updated.')
    } finally {
      setReviewSaving(false)
    }
  }

  async function deleteReview(reviewId: string) {
    setReviewSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', profile.id)
      if (error) throw error
      setReviews((current) => current.filter((review) => review.id !== reviewId))
      toast.success('Review deleted')
    } catch (error) {
      console.error('Could not delete review:', error)
      toast.error(error instanceof Error ? error.message : 'Review could not be deleted.')
    } finally {
      setReviewSaving(false)
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const tabs: Tab[] = ['profile', 'reviews', 'history']
    const currentIndex = tabs.indexOf(activeTab)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    setActiveTab(tabs[nextIndex])
    document.getElementById(`account-tab-${tabs[nextIndex]}`)?.focus()
  }

  const tabLabels: Record<Tab, string> = {
    profile: 'Profile',
    reviews: `Reviews (${reviews.length})`,
    history: `History (${redemptions.length + views.length})`,
  }
  const memberText = profile.emailConfirmed ? 'ESR Verified Foodie Member' : 'ESR Foodie Member'

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-8 sm:py-12">
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[var(--background)]">
        <Image
          src="/images/account-cafe-optimized.webp"
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[var(--background)]/[0.88]" />
      </div>

      <div className="mx-auto max-w-[860px] space-y-5">
        <section className="esr-card flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--crimson)] bg-[var(--surface-muted)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--crimson)]">
                  {fullName.charAt(0).toUpperCase() || 'E'}
                </span>
              )}
              <button
                type="button"
                aria-label="Change profile photo"
                onClick={() => avatarInput.current?.click()}
                className="absolute bottom-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white bg-[var(--crimson)] text-white shadow-sm"
              >
                <Camera aria-hidden="true" size={18} />
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  chooseAvatar(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 id="account-title" className="esr-serif truncate text-2xl text-[var(--plum)] sm:text-3xl">
                {fullName || 'Your account'}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--crimson)]">
                <Shield aria-hidden="true" size={16} /> {memberText}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] px-5 text-sm font-semibold text-[var(--plum)] hover:bg-[var(--surface-soft)]"
          >
            Sign out
          </button>
        </section>

        <section className="esr-card rounded-3xl p-3 sm:p-5">
          <div
            role="tablist"
            aria-label="Account sections"
            onKeyDown={handleTabKeyDown}
            className="flex gap-2 overflow-x-auto rounded-full bg-[var(--surface-muted)] p-1"
          >
            {(['profile', 'reviews', 'history'] as const).map((tab) => (
              <button
                key={tab}
                id={`account-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`account-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--crimson)] text-white'
                    : 'text-[var(--plum)] hover:bg-white'
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div
            id={`account-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`account-tab-${activeTab}`}
            tabIndex={0}
            className="pt-5"
          >
            {activeTab === 'profile' && (
              <form onSubmit={saveProfile} className="mx-auto max-w-xl space-y-5">
                <div>
                  <label htmlFor="account-full-name" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Full Name</label>
                  <input
                    id="account-full-name"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    maxLength={120}
                    className="esr-auth-input min-h-12 w-full rounded-[14px] px-4 text-base"
                  />
                </div>
                <div>
                  <label htmlFor="account-email" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Email Address</label>
                  <div className="relative">
                    <Mail aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--plum)]" />
                    <input
                      id="account-email"
                      type="email"
                      value={profile.email}
                      readOnly
                      aria-readonly="true"
                      aria-describedby="account-email-help"
                      className="esr-auth-input min-h-12 w-full rounded-[14px] bg-[var(--surface-muted)] pl-11 pr-4 text-base"
                    />
                  </div>
                  <p id="account-email-help" className="mt-1 text-sm text-[var(--muted)]">Email can&apos;t be changed here</p>
                </div>
                <div>
                  <label htmlFor="account-phone" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Phone Number</label>
                  <input
                    id="account-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+92 300 1234567"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={32}
                    className="esr-auth-input min-h-12 w-full rounded-[14px] px-4 text-base"
                  />
                </div>
                {saveError && <p role="alert" className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm font-medium text-[var(--plum)]">Error: {saveError}</p>}
                <p role="status" aria-live="polite" aria-atomic="true" className="min-h-6 text-center text-sm font-semibold text-[var(--crimson)]">
                  {saveMessage}
                </p>
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={saving}
                    className="esr-primary-button inline-flex min-h-12 min-w-60 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <ButtonLoader label="Saving changes…" /> : <><Check aria-hidden="true" size={18} /> Save changes</>}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'reviews' && (
              <section aria-label="Your reviews" className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
                    <p className="text-base text-[var(--plum)]">You haven&apos;t reviewed anything yet.</p>
                    <Link href="/user/offers" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--crimson)] underline underline-offset-2">
                      Explore restaurants →
                    </Link>
                  </div>
                ) : reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-[var(--border)] bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="esr-serif text-xl text-[var(--plum)]">{review.restaurants?.name || 'Restaurant'}</h2>
                        <time className="mt-1 block text-sm text-[var(--muted)]" dateTime={review.created_at}>{dateLabel(review.created_at)}</time>
                      </div>
                      <span aria-label={`Rated ${Number(review.rating_overall || 0).toFixed(1)} out of 5`} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3 text-sm font-bold text-[var(--plum)]">
                        <Star aria-hidden="true" size={15} fill="currentColor" /> {Number(review.rating_overall || 0).toFixed(1)}
                      </span>
                    </div>
                    {editingReview === review.id ? (
                      <div className="mt-4 space-y-3">
                        <label htmlFor={`review-edit-${review.id}`} className="block text-sm font-semibold text-[var(--plum)]">Review text</label>
                        <textarea
                          id={`review-edit-${review.id}`}
                          value={editText}
                          onChange={(event) => setEditText(event.target.value)}
                          rows={4}
                          className="esr-auth-input w-full rounded-xl p-3 text-base"
                        />
                        <label htmlFor={`rating-edit-${review.id}`} className="block text-sm font-semibold text-[var(--plum)]">Rating out of 5</label>
                        <select
                          id={`rating-edit-${review.id}`}
                          value={editRating}
                          onChange={(event) => setEditRating(Number(event.target.value))}
                          className="esr-auth-input min-h-11 rounded-xl px-3 text-base"
                        >
                          {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                        </select>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={reviewSaving} onClick={() => void saveReview(review.id)} className="esr-primary-button min-h-11 rounded-full px-4 text-sm">Save review</button>
                          <button type="button" onClick={() => setEditingReview(null)} className="esr-outline-button min-h-11 rounded-full px-4 text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--plum)]">{review.comment || 'No written comment.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEdit(review)} className="esr-outline-button min-h-11 rounded-full px-4 text-sm">Edit review</button>
                          <button type="button" disabled={reviewSaving} onClick={() => void deleteReview(review.id)} className="esr-outline-button inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-[var(--crimson)]">
                            <Trash2 aria-hidden="true" size={16} /> Delete review
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </section>
            )}

            {activeTab === 'history' && (
              <section aria-label="Dining history" className="space-y-6">
                {redemptions.length === 0 && views.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center text-base text-[var(--plum)]">
                    Your dining history will appear here.
                  </p>
                ) : (
                  <>
                    {redemptions.length > 0 && (
                      <div>
                        <h2 className="esr-serif mb-3 text-xl text-[var(--plum)]">Discounts and vouchers</h2>
                        <ul className="space-y-3">
                          {redemptions.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                              <div>
                                <p className="font-semibold text-[var(--plum)]">{item.offers?.name || 'Restaurant offer'}</p>
                                <p className="mt-1 text-sm text-[var(--muted)]">{item.offers?.restaurants?.name || 'Restaurant'}</p>
                              </div>
                              <time className="text-sm text-[var(--muted)]" dateTime={item.used_at}>{dateLabel(item.used_at)}</time>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {views.length > 0 && (
                      <div>
                        <h2 className="esr-serif mb-3 text-xl text-[var(--plum)]">Recently viewed restaurants</h2>
                        <ul className="space-y-3">
                          {views.map((view) => (
                            <li key={view.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                              <p className="font-semibold text-[var(--plum)]">
                                {view.restaurants?.name || 'Restaurant'}
                                {view.restaurants?.city ? <span className="font-normal text-[var(--muted)]"> · {view.restaurants.city}</span> : null}
                              </p>
                              <time className="text-sm text-[var(--muted)]" dateTime={view.viewed_at}>{dateLabel(view.viewed_at)}</time>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
