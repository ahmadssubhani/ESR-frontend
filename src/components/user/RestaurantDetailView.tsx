'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Clock3, Copy, Heart, MapPin, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Offer {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  original_price: number
  discounted_price: number
  image_url: string | null
  valid_from: string
  valid_till: string
  restaurants: Restaurant | null
}

interface Restaurant {
  id: string
  name: string
  city?: string | null
  address?: string | null
  country?: string | null
  phone_number?: string | null
  opening_hours?: string | null
  description?: string | null
  website?: string | null
  lat: number | null
  lng: number | null
  cover_url: string | null
  image_url?: string | null
  logo_url: string | null
  tags?: string[] | null
  restaurant_type?: string | null
  categories: { name: string } | null
}

interface Review {
  id: string
  rating_overall: number | null
  comment: string | null
  created_at: string
  helpful_count?: number | null
  restaurant_response?: string | null
  profiles?: { full_name: string | null; image_url: string | null } | null
  offers?: { name: string } | null
  review_images?: { image_url: string }[]
}

interface Props {
  restaurant: Restaurant
  offers: Offer[]
  userId: string | null
  claimedOfferIds: Set<string>
  reviewedRestaurantIds: Set<string>
  onClaimed: (offerId: string) => void
  onReviewed: (restaurantId: string) => void
  onBack: () => void
}

function discoverImage(restaurant: Restaurant) {
  return restaurant.cover_url || restaurant.image_url || restaurant.logo_url || ''
}

function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10)
}

export default function RestaurantDetailView({
  restaurant,
  offers,
  userId,
  claimedOfferIds,
  reviewedRestaurantIds,
  onClaimed,
  onReviewed,
  onBack,
}: Props) {
  const [saved, setSaved] = useState(false)
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null)
  const [panelStep, setPanelStep] = useState<'review' | 'voucher' | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [liveMessage, setLiveMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewSort, setReviewSort] = useState('recent')
  const [visibleReviewCount, setVisibleReviewCount] = useState(6)
  const [reviewSortAnnouncement, setReviewSortAnnouncement] = useState('')
  const [reviewsError, setReviewsError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelRefs = useRef(new Map<string, HTMLDivElement>())
  const restaurantKey = restaurant.id
  const category = restaurant.categories?.name || restaurant.restaurant_type || 'Restaurant'
  const city = restaurant.city || ''
  const address = restaurant.address || ''
  const location = [address, city, restaurant.country === 'PK' ? 'Pakistan' : restaurant.country]
    .filter(Boolean)
    .join(', ')
  const image = discoverImage(restaurant)
  const phone = restaurant.phone_number || ''
  const hours = restaurant.opening_hours || 'Hours not provided'
  const tags = restaurant.tags || []

  useEffect(() => {
    headingRef.current?.focus()
  }, [restaurant.id])

  useEffect(() => {
    if (!expandedOfferId) return
    panelRefs.current.get(expandedOfferId)?.focus()
  }, [expandedOfferId, panelStep])

  useEffect(() => {
    let active = true
    async function loadReviews() {
      try {
        const response = await fetch(`/api/reviews/by-restaurant/${encodeURIComponent(restaurant.id)}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load diner reviews.')
        if (active && Array.isArray(data)) setReviews(data as Review[])
      } catch (error) {
        if (!active) return
        console.error('Could not load restaurant reviews:', error)
        setReviewsError('Diner reviews could not be loaded right now.')
      }
    }
    void loadReviews()
    return () => {
      active = false
    }
  }, [restaurant.id])

  useEffect(() => {
    if (!userId) return
    let active = true
    const supabase = createClient()
    void supabase
      .from('user_restaurants')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Could not load saved restaurant state:', error)
          setSaveMessage('Saved status could not be loaded.')
          return
        }
        setSaved(Boolean(data))
      })
    return () => { active = false }
  }, [restaurant.id, userId])

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews]
    if (reviewSort === 'highest') return sorted.sort((a, b) => (b.rating_overall || 0) - (a.rating_overall || 0))
    if (reviewSort === 'lowest') return sorted.sort((a, b) => (a.rating_overall || 0) - (b.rating_overall || 0))
    if (reviewSort === 'helpful') return sorted.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
    return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [reviewSort, reviews])

  const reviewCount = reviews.length
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + (review.rating_overall || 0), 0) / reviews.length).toFixed(1)
    : '—'
  const sortLabels: Record<string, string> = {
    recent: 'Most recent',
    highest: 'Highest rated',
    lowest: 'Lowest rated',
    helpful: 'Most helpful',
  }

  async function toggleSavedRestaurant() {
    if (!userId) {
      setSaveMessage('Sign in to save this restaurant.')
      return
    }
    const supabase = createClient()
    const result = saved
      ? await supabase.from('user_restaurants').delete().eq('user_id', userId).eq('restaurant_id', restaurantKey)
      : await supabase.from('user_restaurants').insert({ user_id: userId, restaurant_id: restaurantKey })
    if (result.error) {
      console.error('Could not update saved restaurant:', result.error)
      setSaveMessage('This restaurant could not be saved right now.')
      toast.error('Could not update your saved restaurants.')
      return
    }
    setSaved(!saved)
    setSaveMessage('')
    toast.success(saved ? 'Removed from saved restaurants' : 'Restaurant saved')
  }

  async function claimVoucher(offer: Offer) {
    if (!userId) {
      setClaimError('Sign in to claim this discount.')
      setLiveMessage('Sign in to claim this discount.')
      return
    }
    setIsClaiming(true)
    setClaimError('')
    try {
      const response = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offer.id }),
      })
      const data = await response.json()
      if (response.status === 401) {
        setClaimError('Sign in to claim this discount.')
        setLiveMessage('Sign in to claim this discount.')
        return
      }
      if (!response.ok || !data.voucher_code) {
        const message = data.error || data.message || 'Could not claim this voucher.'
        setClaimError(message)
        setLiveMessage(message)
        return
      }
      setVoucherCode(data.voucher_code as string)
      onClaimed(offer.id)
      setLiveMessage(data.already_claimed ? 'Your claimed voucher is ready.' : 'Voucher claimed successfully.')
    } catch (error) {
      console.error('Could not claim voucher:', error)
      setClaimError('Could not claim this voucher. Please try again.')
      setLiveMessage('Could not claim this voucher. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }

  async function openVoucherPanel(offer: Offer) {
    if (expandedOfferId === offer.id) {
      setExpandedOfferId(null)
      setPanelStep(null)
      setLiveMessage('')
      return
    }
    setExpandedOfferId(offer.id)
    setVoucherCode('')
    setClaimError('')
    setLiveMessage('')
    setCopied(false)

    if (!userId) {
      setPanelStep('voucher')
      setClaimError('Sign in to claim this discount.')
      return
    }

    if (claimedOfferIds.has(offer.id) || reviewedRestaurantIds.has(restaurantKey)) {
      setPanelStep('voucher')
      await claimVoucher(offer)
    } else {
      setReviewRating(5)
      setReviewText('')
      setPanelStep('review')
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>, offer: Offer) {
    event.preventDefault()
    if (!reviewText.trim()) {
      setClaimError('Write a short review before unlocking your voucher.')
      return
    }
    setIsSubmittingReview(true)
    setClaimError('')
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantKey,
          offer_id: offer.id,
          comment: reviewText.trim(),
          rating_overall: reviewRating,
          rating_taste: reviewRating,
          rating_ambiance: reviewRating,
          rating_quality: reviewRating,
          rating_money_value: reviewRating,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setClaimError('Sign in to submit a review and claim this discount.')
        return
      }
      if (!response.ok) throw new Error(data.error || 'Could not save your review.')
      if (data && typeof data === 'object' && typeof data.id === 'string') {
        setReviews((current) => [data as Review, ...current.filter((review) => review.id !== data.id)])
      }
      onReviewed(restaurantKey)
      setPanelStep('voucher')
      setLiveMessage('Review submitted. Your voucher is being prepared.')
      await claimVoucher(offer)
    } catch (error) {
      console.error('Could not submit review:', error)
      setClaimError(error instanceof Error ? error.message : 'Could not save your review.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  async function copyVoucherCode() {
    if (!voucherCode) return
    try {
      await navigator.clipboard.writeText(voucherCode)
      setCopied(true)
      setLiveMessage('Voucher code copied.')
    } catch (error) {
      console.error('Could not copy voucher code:', error)
      setClaimError('Could not copy the voucher code. Select and copy it instead.')
    }
  }

  const mapUrl = restaurant.lat != null && restaurant.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${location}`)}`

  return (
    <main className="esr-restaurant-detail mx-auto max-w-[1140px] space-y-12 px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/user/offers" onClick={(event) => { event.preventDefault(); onBack() }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--plum)] hover:text-[var(--crimson)]">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to restaurants
      </Link>

      <section className="grid items-center gap-8 lg:grid-cols-[1fr_380px] lg:gap-16" aria-labelledby="restaurant-title">
        <div className="order-2 space-y-5 lg:order-1">
          <p className="esr-eyebrow">{city || 'Pakistan'} · {category} · HALAL DINING</p>
          <h1 id="restaurant-title" ref={headingRef} tabIndex={-1} className="esr-serif max-w-2xl text-4xl font-normal leading-tight focus-visible:outline-offset-4 sm:text-5xl">
            {restaurant.name}
          </h1>
          {restaurant.description && <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">{restaurant.description}</p>}
          <ul className="space-y-3 text-sm text-[var(--muted)]">
            <li className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--crimson)]" size={18} />{location || 'Location not provided'}</li>
            {phone && <li className="flex items-center gap-2"><span aria-hidden="true">☎</span><a className="underline underline-offset-2" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></li>}
            <li className="flex items-center gap-2"><Clock3 aria-hidden="true" className="text-[var(--crimson)]" size={18} />Hours: {hours}</li>
          </ul>
          <button type="button" aria-pressed={saved} onClick={toggleSavedRestaurant} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--plum)] transition-colors hover:bg-[var(--surface-muted)]">
            <Heart aria-hidden="true" size={18} className={saved ? 'fill-[var(--crimson)] text-[var(--crimson)]' : ''} />
            {saved ? 'Saved' : '♡ Save restaurant'}
          </button>
          {saveMessage && (
            <p role="status" className="text-sm text-[var(--plum)]">
              {saveMessage}{!userId && <> <Link href="/auth/login?next=%2Fuser%2Foffers" className="font-semibold text-[var(--crimson)] underline underline-offset-2">Login</Link> or <Link href="/auth/signup" className="font-semibold text-[var(--crimson)] underline underline-offset-2">sign up</Link>.</>}
            </p>
          )}
        </div>
        <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-[48px_20px_20px_20px] bg-[var(--surface-muted)] lg:order-2">
          {image ? <Image src={image} alt={`Dining at ${restaurant.name}`} fill sizes="(max-width: 1024px) 100vw, 380px" className="object-cover" /> : <div className="grid h-full place-items-center text-5xl text-[var(--muted)]" aria-hidden="true">🍽️</div>}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-y border-[var(--border)] py-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Restaurant amenities and location">
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => <li key={tag} className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--plum)]">{tag}</li>)}
        </ul>
        <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span>{category}</span><span aria-hidden="true">·</span>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-[var(--crimson)] underline-offset-2 hover:underline">
            Open map <span aria-hidden="true">↗</span><span className="sr-only">(opens in new tab)</span>
          </a>
        </p>
      </section>

      <section className="space-y-5" aria-labelledby="restaurant-offers-title">
        <div>
          <p className="esr-eyebrow">A little extra value</p>
          <h2 id="restaurant-offers-title" className="esr-serif mt-2 text-3xl font-normal sm:text-4xl">Offers at this restaurant</h2>
        </div>
        {offers.length ? (
          <div className="space-y-4">
            {offers.map((offer) => {
              const isOpen = expandedOfferId === offer.id
              const panelId = `voucher-panel-${offer.id}`
              const percent = offer.original_price > 0 ? Math.ceil(100 - (offer.discounted_price / offer.original_price) * 100) : 0
              return (
                <article key={offer.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="space-y-2">
                      <p className="esr-eyebrow">{percent}% off · Every day</p>
                      <h3 className="esr-serif text-2xl font-normal">{offer.name}</h3>
                      {offer.description && <p className="text-sm leading-6 text-[var(--muted)]">{offer.description}</p>}
                      <p className="text-sm leading-6 text-[var(--muted)]">Valid {readableDate(offer.valid_from)} to {readableDate(offer.valid_till)}</p>
                    </div>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => void openVoucherPanel(offer)}
                      className="esr-primary-button inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm transition-colors"
                    >
                      {claimedOfferIds.has(offer.id) ? 'View voucher →' : 'Avail discount →'}
                    </button>
                  </div>

                  <div
                    id={panelId}
                    hidden={!isOpen}
                    ref={(element) => {
                      if (element) panelRefs.current.set(offer.id, element)
                      else panelRefs.current.delete(offer.id)
                    }}
                    tabIndex={-1}
                    className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--crimson)] sm:p-6"
                  >
                    {panelStep === 'review' && (
                      <form onSubmit={(event) => void submitReview(event, offer)} className="space-y-4">
                        <div>
                          <h4 className="esr-serif text-xl">A quick note about your visit</h4>
                          <p className="mt-1 text-sm text-[var(--muted)]">Share a rating and short review to unlock this voucher.</p>
                        </div>
                        <fieldset>
                          <legend className="mb-2 text-sm font-semibold text-[var(--plum)]">Rate your experience</legend>
                          <div className="flex flex-wrap gap-1" role="group" aria-label="Rate your experience">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button key={rating} type="button" aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`} aria-pressed={reviewRating === rating} onClick={() => setReviewRating(rating)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--crimson)]">
                                <Star aria-hidden="true" className={rating <= reviewRating ? 'fill-[var(--crimson)] text-[var(--crimson)]' : 'text-[var(--muted)]'} size={22} />
                              </button>
                            ))}
                          </div>
                        </fieldset>
                        <label htmlFor={`review-${offer.id}`} className="block text-sm font-semibold text-[var(--plum)]">Your review</label>
                        <textarea id={`review-${offer.id}`} required value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={3} placeholder="How was the food, service, or atmosphere?" className="w-full rounded-xl border border-[var(--border)] bg-white p-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--crimson)]" />
                        <button type="submit" disabled={isSubmittingReview} className="esr-primary-button min-h-11 rounded-xl px-5 py-3 text-sm disabled:opacity-60">
                          {isSubmittingReview ? 'Submitting review…' : 'Submit review & get voucher'}
                        </button>
                      </form>
                    )}
                    {panelStep === 'voucher' && (
                      <div className="space-y-3">
                        <h4 className="esr-serif text-xl">{voucherCode ? 'Your voucher is ready' : 'Voucher details'}</h4>
                        {voucherCode ? (
                          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[var(--muted)]">Show this code at checkout</p>
                            <p className="mt-1 text-2xl font-bold tracking-wider text-[var(--plum)]">{voucherCode}</p>
                            <button type="button" onClick={() => void copyVoucherCode()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--crimson)]">
                              {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}{copied ? 'Copied' : 'Copy code'}
                            </button>
                          </div>
                        ) : isClaiming ? <p className="text-sm text-[var(--muted)]">Preparing your voucher…</p> : null}
                        <p className="text-sm leading-6 text-[var(--muted)]">Dine-in only. Present your active ESR voucher before payment. Not combinable with other offers.</p>
                      </div>
                    )}
                    {claimError && (
                      <p role="status" className="mt-3 text-sm font-semibold text-[var(--crimson)]">
                        {claimError}
                        {claimError.includes('Sign in') && <> <Link href="/auth/login?next=%2Fuser%2Foffers" className="underline underline-offset-2">Login</Link> or <Link href="/auth/signup" className="underline underline-offset-2">sign up</Link>.</>}
                      </p>
                    )}
                    <p className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">There are no current offers at this restaurant.</p>}
      </section>

      <section className="esr-reviews space-y-4 sm:space-y-5" aria-labelledby="diner-reviews-title">
        <div className="esr-review-summary grid gap-4 rounded-[20px] border border-[var(--border)] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <h2 id="diner-reviews-title" className="esr-serif text-2xl">Diner reviews</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>
          </div>
          <div role="img" aria-label={`Rated ${averageRating} out of 5 from ${reviewCount} reviews`} className="whitespace-nowrap text-2xl font-bold text-[var(--plum)] sm:text-[28px]">
            <span aria-hidden="true">★</span> {averageRating} / 5 overall
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 min-[481px]:flex-row min-[481px]:justify-end">
          <label htmlFor="review-sort" className="text-sm font-semibold text-[var(--plum)]">Sort by</label>
          <div className="relative w-full min-[481px]:w-auto">
          <select id="review-sort" value={reviewSort} onChange={(event) => {
            setReviewSort(event.target.value)
            setVisibleReviewCount(6)
            setReviewSortAnnouncement(`Reviews sorted by ${sortLabels[event.target.value]}`)
          }} className="min-h-11 w-full appearance-none rounded-xl border border-[var(--input-border)] bg-white py-2 pl-3 pr-10 text-base font-medium text-[var(--plum)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crimson)] min-[481px]:w-56">
            <option value="recent">Most recent</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
            <option value="helpful">Most helpful</option>
          </select>
            <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--plum)]" />
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{reviewSortAnnouncement}</p>
        {reviewsError && <p role="status" className="text-sm text-[var(--muted)]">{reviewsError}</p>}
        {sortedReviews.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0 sm:gap-4">
            {sortedReviews.slice(0, visibleReviewCount).map((review) => {
              const reviewerName = review.profiles?.full_name || 'ESR diner'
              const rating = review.rating_overall?.toFixed(1) || '—'
              const reviewDate = new Date(review.created_at)
              const isoDate = Number.isNaN(reviewDate.getTime()) ? '' : reviewDate.toISOString().slice(0, 10)
              const formattedDate = Number.isNaN(reviewDate.getTime())
                ? review.created_at
                : reviewDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
              <li key={review.id} className="esr-card space-y-4 rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-base font-bold text-[var(--crimson)]">{reviewerName.trim().charAt(0).toUpperCase() || 'E'}</span>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[var(--plum)]">{reviewerName}</p>
                      <time className="mt-1 block text-sm text-[var(--muted)]" dateTime={isoDate || undefined}>{formattedDate}</time>
                    </div>
                  </div>
                  <div role="img" aria-label={`Rated ${rating} out of 5`} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-[var(--surface-muted)] px-3 text-sm font-bold text-[var(--plum)]">
                    <span aria-hidden="true">★</span> {rating}
                  </div>
                </div>
                <p className="text-base leading-[1.6] text-[var(--plum)]">{review.comment || 'No written comment.'}</p>
                {review.restaurant_response && (
                  <div className="rounded-r-xl border-l-[3px] border-[var(--crimson)] bg-[var(--surface-soft)] p-4">
                    <p className="font-bold text-[var(--plum)]">Restaurant response</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--plum)]">{review.restaurant_response}</p>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        ) : !reviewsError ? <p className="text-sm text-[var(--muted)]">No reviews have been shared yet.</p> : null}
        {sortedReviews.length > visibleReviewCount && (
          <div className="flex justify-center">
            <button type="button" onClick={() => setVisibleReviewCount((count) => count + 6)} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--plum)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crimson)]">
              Show more reviews
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
