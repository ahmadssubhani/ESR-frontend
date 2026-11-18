'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MapPin,
  Search,
  Heart,
  Tag,
  SlidersHorizontal,
  Ticket,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Star,
  X,
  Copy,
  Clock,
  Check,
  MessageSquarePlus,
  Send
} from 'lucide-react'
import { toggleSaveOffer, createClient } from '@/lib/supabase/client'
import type { AdminAd, Offer } from '@/types/database'
import {
  isDbOfferId,
  readSavedOfferIds,
  writeSavedOfferIds,
  upsertSavedOfferSnapshot,
  removeSavedOfferSnapshot,
} from '@/lib/saved-offers'
import { toast } from 'sonner'
import { PageLoader } from '@/components/ui/loader'
import { formatVoucherCountdown, generateEsrVoucherCode } from '@/lib/esr-voucher-code'

interface OfferWithRestaurant extends Offer {
  restaurants: {
    id: string
    name: string
    city?: string | null
    address?: string | null
    lat: number | null
    lng: number | null
    cover_url: string | null
    logo_url: string | null
    is_featured?: boolean
    categories: { name: string } | null
  } | null
}

interface VerifiedReview {
  id: string
  userName: string
  userAvatar: string
  restaurantName: string
  dishName: string
  rating: number
  reviewText: string
  image: string
  date: string
}

interface Props {
  ads?: AdminAd[]
  featured?: OfferWithRestaurant[]
  bumper?: OfferWithRestaurant[]
  initialOffers?: OfferWithRestaurant[]
  demoMode?: boolean
}

const VERIFIED_REVIEWS: VerifiedReview[] = [
  {
    id: 'rev-1',
    userName: 'Usman Chaudhry',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    restaurantName: 'Burger Craft',
    dishName: 'Smash Cheeseburger Deal',
    rating: 5,
    reviewText: '100% verified review with photo confirmation. The beef smash burger was cooked to perfection. ESR voucher was accepted without any hassle.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    date: 'August 4, 2026',
  },
]

const discountPct = (o: Offer) =>
  o.original_price > 0 ? Math.ceil(100 - (o.discounted_price / o.original_price) * 100) : 0

const normalizeFilterValue = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const CUISINE_FILTERS = ['All', 'Pakistani', 'Burgers', 'Continental', 'BBQ', 'Cafés', 'Pizza']
const CITY_FILTERS = ['All cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar']

async function fetchNearbyRestaurants(lat: number, lng: number, mode: 'top' | 'nearby') {
  const res = await fetch(`/api/restaurants/nearby?lat=${lat}&lng=${lng}&mode=${mode}`)
  const data = await res.json()
  if (res.ok && Array.isArray(data)) return data as OfferWithRestaurant[]
  return []
}

export default function OffersClient({ ads = [], featured = [], bumper = [], initialOffers = [], demoMode = false }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(tabParam || 'all')
  const [activeCuisine, setActiveCuisine] = useState('All')
  const [selectedCity, setSelectedCity] = useState('All cities')
  const [browseTab, setBrowseTab] = useState<'featured' | 'nearby' | 'latest'>('featured')
  
  const [modalStep, setModalStep] = useState<'review' | 'claim' | null>(null)
  const [selectedClaimOffer, setSelectedClaimOffer] = useState<OfferWithRestaurant | null>(null)
  
  const [reviewedRestaurantIds, setReviewedRestaurantIds] = useState<Set<string>>(new Set())

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const [isCopied, setIsCopied] = useState(false)
  const [activeVoucherCode, setActiveVoucherCode] = useState('')
  const [voucherCountdown, setVoucherCountdown] = useState('30:00')
  const [claimError, setClaimError] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)

  useEffect(() => {
    const savedReviews = localStorage.getItem('esr_reviewed_restaurants')
    if (savedReviews) {
      try {
        const parsed = JSON.parse(savedReviews)
        setReviewedRestaurantIds(new Set(parsed))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  async function persistClaim(offer: OfferWithRestaurant) {
    setIsClaiming(true)
    setClaimError('')
    try {
      if (demoMode) {
        const code = `ESR-${offer.id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`
        setActiveVoucherCode(code)
        setClaimedOfferIds((prev) => {
          const next = new Set(prev).add(offer.id)
          localStorage.setItem('esr_demo_claimed_offers', JSON.stringify(Array.from(next)))
          return next
        })
        toast.success('Demo voucher claimed — no account or database required.')
        return true
      }

      const res = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offer.id }),
      })
      const data = await res.json()
      if (res.status === 401) {
        toast.error('Please sign in to claim this voucher')
        router.push('/auth/login')
        return false
      }
      if (!res.ok || !data.voucher_code) {
        const message = data.error || data.message || 'Could not claim voucher'
        setClaimError(message)
        toast.error(message)
        return false
      }
      setActiveVoucherCode(generateEsrVoucherCode(offer.id))
      setClaimedOfferIds((prev) => new Set(prev).add(offer.id))
      if (data.already_claimed) {
        toast.success('Showing your claimed voucher')
      } else {
        toast.success('Voucher claimed — it now appears in admin')
      }
      return true
    } catch {
      toast.error('Could not claim voucher. Try again.')
      return false
    } finally {
      setIsClaiming(false)
    }
  }

  useEffect(() => {
    if (modalStep !== 'claim' || !selectedClaimOffer || !activeVoucherCode) return
    const tick = () => {
      setActiveVoucherCode(generateEsrVoucherCode(selectedClaimOffer.id))
      setVoucherCountdown(formatVoucherCountdown())
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [modalStep, selectedClaimOffer, activeVoucherCode])

  useEffect(() => {
    if (tabParam === 'foodies-feed') {
      router.replace('/user/foodies-feed')
      return
    }
    if (tabParam) {
      setActiveCategory(tabParam)
    } else {
      setActiveCategory('all')
    }
  }, [tabParam, router])

  const [offers, setOffers] = useState<OfferWithRestaurant[]>(initialOffers)
  const [nearbyOffers, setNearbyOffers] = useState<OfferWithRestaurant[]>([])
  const [topRestaurantsActive, setTopRestaurantsActive] = useState(false)
  const [nearbyRestaurantsActive, setNearbyRestaurantsActive] = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [locMode, setLocMode] = useState<'top' | 'nearby' | null>(null)
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set())
  const [claimedOfferIds, setClaimedOfferIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setOffers(initialOffers)
  }, [initialOffers])

  useEffect(() => {
    if (demoMode) return
    const supabase = createClient()
    const channel = supabase
      .channel('public-offers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, async (payload) => {
        const id =
          (payload.new as { id?: string } | null)?.id ||
          (payload.old as { id?: string } | null)?.id
        if (!id) return
        if (payload.eventType === 'DELETE') {
          setOffers((prev) => prev.filter((offer) => offer.id !== id))
          return
        }
        const { data, error } = await supabase
          .from('offers')
          .select(
            '*, restaurants!inner(id, name, city, address, lat, lng, cover_url, logo_url, is_featured, categories(name))'
          )
          .eq('id', id)
          .eq('approval_status', true)
          .eq('is_redeemable', true)
          .eq('is_bumper', false)
          .eq('restaurants.is_active', true)
          .maybeSingle()
        if (error) {
          router.refresh()
          return
        }
        if (!data) {
          setOffers((prev) => prev.filter((offer) => offer.id !== id))
          return
        }
        const mapped = data as OfferWithRestaurant
        setOffers((prev) => {
          const exists = prev.some((offer) => offer.id === mapped.id)
          if (exists) return prev.map((offer) => (offer.id === mapped.id ? mapped : offer))
          return [mapped, ...prev]
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_ads' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [demoMode, router])

  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  type DiscountRange = { id: string; label: string; min?: number; max?: number }
  const DISCOUNT_RANGES: DiscountRange[] = [
    { id: 'all', label: 'All Open Deals' },
    { id: '0-5', label: '0-5% OFF', min: 0, max: 5 },
    { id: '6-10', label: '6-10% OFF', min: 6, max: 10 },
    { id: '11-20', label: '11-20% OFF', min: 11, max: 20 },
    { id: '21-35', label: '21-35% OFF', min: 21, max: 35 },
  ]
  const [selectedDiscount, setSelectedDiscount] = useState<string>('all')

  // Do NOT auto-activate Nearby on mount — that hid DB "All Offers" behind an empty
  // location feed. Nearby / Top only run when the user clicks those chips.

  const applyNearbyResults = (
    mode: 'top' | 'nearby',
    data: OfferWithRestaurant[],
    options?: { activate?: boolean }
  ) => {
    setNearbyOffers(data)
    const shouldActivate = options?.activate !== false
    if (!shouldActivate) return
    if (mode === 'top') {
      setTopRestaurantsActive(true)
      setNearbyRestaurantsActive(false)
    } else {
      setNearbyRestaurantsActive(true)
      setTopRestaurantsActive(false)
    }
  }

  const handleLocationFilter = (
    mode: 'top' | 'nearby',
    options?: { silent?: boolean; activateOnSuccess?: boolean; highlightChip?: boolean }
  ) => {
    const activateOnSuccess = options?.activateOnSuccess !== false
    const highlightChip = options?.highlightChip ?? !options?.silent

    if (highlightChip) {
      if (mode === 'top') {
        setTopRestaurantsActive(true)
        setNearbyRestaurantsActive(false)
      } else {
        setNearbyRestaurantsActive(true)
        setTopRestaurantsActive(false)
      }
    }

    setLocMode(mode)
    setLocLoading(true)

    const finishWithoutLocation = (message: string) => {
      setNearbyOffers([])
      setTopRestaurantsActive(false)
      setNearbyRestaurantsActive(false)
      setLocMode(null)
      setLocLoading(false)
      if (!options?.silent) {
        toast.error(message)
      }
    }

    if (demoMode) {
      const localOffers = initialOffers.filter((offer) =>
        mode === 'nearby'
          ? offer.restaurants?.city === 'Karachi'
          : offer.restaurants?.is_featured
      )
      setNearbyOffers(localOffers)
      setTopRestaurantsActive(mode === 'top')
      setNearbyRestaurantsActive(mode === 'nearby')
      setLocMode(null)
      setLocLoading(false)
      toast.success(`Showing ${localOffers.length} demo restaurants in Karachi`)
      return
    }

    const loadByCoords = async (lat: number, lng: number) => {
      try {
        const data = await fetchNearbyRestaurants(lat, lng, mode)
        applyNearbyResults(mode, data, { activate: activateOnSuccess })
        if (activateOnSuccess && !options?.silent) {
          toast.success(
            mode === 'top'
              ? `Found ${data.length} top restaurants`
              : `Found ${data.length} nearby restaurants`
          )
        }
      } catch (err) {
        console.error('Failed to load nearby restaurants:', err)
        setNearbyOffers([])
        if (highlightChip || activateOnSuccess) {
          setTopRestaurantsActive(false)
          setNearbyRestaurantsActive(false)
        }
        if (!options?.silent) {
          toast.error('Could not load restaurants near you')
        }
      } finally {
        setLocMode(null)
        setLocLoading(false)
      }
    }

    if (!navigator.geolocation) {
      finishWithoutLocation('Location is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadByCoords(pos.coords.latitude, pos.coords.longitude)
      },
      (error) => {
        console.warn(`Geolocation unavailable (${error.code}): ${error.message}`)
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access denied — enable location to see nearby restaurants'
            : 'Could not get your location — try again'
        finishWithoutLocation(message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (demoMode) {
      setSavedOfferIds(new Set(readSavedOfferIds()))
      try {
        const claimed: unknown = JSON.parse(localStorage.getItem('esr_demo_claimed_offers') || '[]')
        if (Array.isArray(claimed)) {
          setClaimedOfferIds(new Set(claimed.filter((id): id is string => typeof id === 'string')))
        }
        const reviewed: unknown = JSON.parse(localStorage.getItem('esr_reviewed_restaurants') || '[]')
        if (Array.isArray(reviewed)) {
          setReviewedRestaurantIds(new Set(reviewed.filter((id): id is string => typeof id === 'string')))
        }
      } catch (error) {
        console.error('Could not read saved demo activity:', error)
      }
      return
    }

    async function loadUserData() {
      const localIds = readSavedOfferIds()
      if (localIds.length > 0) {
        setSavedOfferIds(new Set(localIds))
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const [{ data }, { data: claimed }] = await Promise.all([
          supabase.from('user_offers').select('offer_id').eq('user_id', user.id),
          supabase.from('user_coupons').select('offer_id').eq('user_id', user.id).gte('used_at', ago24h),
        ])
        if (claimed) {
          setClaimedOfferIds(new Set(claimed.map((row) => row.offer_id).filter(Boolean)))
        }
        if (data) {
          const rawOffers = data as unknown as { offer_id: string }[]
          const serverSavedIds = rawOffers.map((item) => item.offer_id)
          // Keep locally saved nearby/live restaurants; only replace DB offer IDs from server
          const localExternalIds = readSavedOfferIds().filter((id) => !isDbOfferId(id))
          const merged = Array.from(new Set([...serverSavedIds, ...localExternalIds]))
          setSavedOfferIds(new Set(merged))
          writeSavedOfferIds(merged)
        }
      }
    }
    loadUserData()
  }, [demoMode])

  const activeOffersList = activeCategory === 'saved'
    ? [...offers, ...nearbyOffers].filter(
        (o, index, arr) => savedOfferIds.has(o.id) && arr.findIndex((x) => x.id === o.id) === index
      )
    : (topRestaurantsActive || nearbyRestaurantsActive ? nearbyOffers : offers)

  const filtered = activeOffersList.filter((o) => {
    const searchTerm = normalizeFilterValue(search.trim())
    const matchesSearch =
      !searchTerm ||
      normalizeFilterValue(o.name).includes(searchTerm) ||
      normalizeFilterValue(o.restaurants?.name || '').includes(searchTerm) ||
      normalizeFilterValue(o.restaurants?.city || '').includes(searchTerm) ||
      normalizeFilterValue(o.restaurants?.address || '').includes(searchTerm) ||
      normalizeFilterValue(o.restaurants?.categories?.name || '').includes(searchTerm)
    const matchesCity =
      selectedCity === 'All cities' ||
      normalizeFilterValue(o.restaurants?.city || '') === normalizeFilterValue(selectedCity)
    const matchesCuisine =
      activeCuisine === 'All' ||
      normalizeFilterValue(o.restaurants?.categories?.name || '').includes(
        normalizeFilterValue(activeCuisine)
      )
    const matchesBrowseTab =
      browseTab !== 'featured' || Boolean(o.restaurants?.is_featured)

    const disc = discountPct(o)
    let matchesDiscount = true
    if (selectedDiscount !== 'all') {
      const sel = DISCOUNT_RANGES.find((r) => r.id === selectedDiscount)
      if (sel && typeof sel.min === 'number') {
        matchesDiscount = disc >= (sel.min ?? 0) && disc <= (sel.max ?? sel.min ?? disc)
      }
    }

    return matchesSearch && matchesCity && matchesCuisine && matchesBrowseTab && matchesDiscount
  }).sort((a, b) => {
    if (browseTab !== 'latest') return 0
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const clearLocationFilter = () => {
    setTopRestaurantsActive(false)
    setNearbyRestaurantsActive(false)
    setNearbyOffers([])
  }

  const handleToggleSave = async (e: React.MouseEvent, offer: OfferWithRestaurant) => {
    e.preventDefault()
    e.stopPropagation()

    const offerId = offer.id
    const isSaved = savedOfferIds.has(offerId)
    const newSaved = new Set(savedOfferIds)
    if (isSaved) newSaved.delete(offerId)
    else newSaved.add(offerId)

    setSavedOfferIds(newSaved)
    writeSavedOfferIds(Array.from(newSaved))

    if (isSaved) {
      removeSavedOfferSnapshot(offerId)
      toast.success('Removed from saved')
    } else {
      upsertSavedOfferSnapshot(offer)
      toast.success('Saved to favourites')
    }

    // Only real DB offer UUIDs can be stored in user_offers
    if (userId && isDbOfferId(offerId)) {
      const { error } = await toggleSaveOffer(userId, offerId, isSaved)
      if (error) {
        // Roll back optimistic UI on DB failure
        setSavedOfferIds(savedOfferIds)
        writeSavedOfferIds(Array.from(savedOfferIds))
        if (isSaved) upsertSavedOfferSnapshot(offer)
        else removeSavedOfferSnapshot(offerId)
        console.error('Failed to sync saved offer:', error)
        toast.error('Could not sync save — try again')
      }
    }
  }

  const handleOpenClaimModal = async (offer: OfferWithRestaurant) => {
    try {
      const recent: unknown = JSON.parse(localStorage.getItem('esr_recent_restaurants') || '[]')
      const recentIds = Array.isArray(recent)
        ? recent.filter((id): id is string => typeof id === 'string')
        : []
      const restaurantId = offer.restaurants?.id || offer.restaurant_id
      localStorage.setItem(
        'esr_recent_restaurants',
        JSON.stringify([restaurantId, ...recentIds.filter((id) => id !== restaurantId)].slice(0, 5))
      )
      window.dispatchEvent(new Event('esr-recent-restaurants-updated'))
    } catch (error) {
      console.error('Could not update recently viewed restaurants:', error)
    }

    if (!demoMode && !isDbOfferId(offer.id)) {
      toast.error('This nearby listing is not in the ESR catalog yet, so it cannot be claimed.')
      return
    }
    if (!demoMode && !userId) {
      toast.error('Please sign in to claim this voucher')
      router.push('/auth/login')
      return
    }

    setSelectedClaimOffer(offer)
    setIsCopied(false)
    setActiveVoucherCode('')
    setClaimError('')

    const restaurantKey = offer.restaurants?.id || offer.restaurant_id || offer.id
    if (claimedOfferIds.has(offer.id) || reviewedRestaurantIds.has(restaurantKey)) {
      setModalStep('claim')
      await persistClaim(offer)
      return
    }

    setReviewText('')
    setReviewRating(5)
    setModalStep('review')
  }

  const handleSendReviewAndProceed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewText.trim()) {
      toast.error('Please write a short review before unlocking your voucher.')
      return
    }
    if (!selectedClaimOffer) return

    setIsSubmittingReview(true)
    const restaurantId = selectedClaimOffer.restaurants?.id || selectedClaimOffer.restaurant_id
    try {
      if (demoMode) {
        const updatedReviews = new Set(reviewedRestaurantIds).add(restaurantId)
        setReviewedRestaurantIds(updatedReviews)
        localStorage.setItem('esr_reviewed_restaurants', JSON.stringify(Array.from(updatedReviews)))
        setModalStep('claim')
        await persistClaim(selectedClaimOffer)
        return
      }

      const reviewRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          offer_id: selectedClaimOffer.id,
          comment: reviewText.trim(),
          rating_overall: reviewRating,
          rating_taste: reviewRating,
          rating_ambiance: reviewRating,
          rating_quality: reviewRating,
          rating_money_value: reviewRating,
        }),
      })
      if (reviewRes.status === 401) {
        toast.error('Please sign in to submit a review')
        router.push('/auth/login')
        return
      }
      if (!reviewRes.ok) {
        const data = await reviewRes.json().catch(() => ({}))
        toast.error(data.error || 'Could not save review')
        return
      }

      const restaurantKey = restaurantId || selectedClaimOffer.id
      const updatedReviews = new Set(reviewedRestaurantIds)
      updatedReviews.add(restaurantKey)
      setReviewedRestaurantIds(updatedReviews)
      localStorage.setItem('esr_reviewed_restaurants', JSON.stringify(Array.from(updatedReviews)))

      setModalStep('claim')
      await persistClaim(selectedClaimOffer)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setIsCopied(true)
    toast.success('Voucher code copied')
    setTimeout(() => setIsCopied(false), 2000)
  }

  const currentDiscountLabel = DISCOUNT_RANGES.find((r) => r.id === selectedDiscount)?.label || 'All Discounts'

  return (
    <div className="esr-discover relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
      {demoMode && (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--plum)]">
          Interactive demo · sample restaurants and offers · favorites and vouchers stay in this browser.
        </p>
      )}
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.95fr] lg:gap-12" aria-labelledby="discover-title">
        <div className="py-2">
          <p className="esr-eyebrow">Pakistan, let&apos;s eat well</p>
          <h1 id="discover-title" className="mt-4 max-w-2xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Your city.<br />
            Your favourites.<br />
            <em className="font-normal text-[var(--crimson)]">More to savour.</em>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            From Karachi&apos;s best karahi to Lahore&apos;s favourite tables — discover local restaurants,
            share an honest review and enjoy a discount on your next meal.
          </p>
        </div>
        <div className="relative min-h-[280px] overflow-hidden rounded-[48px_20px_20px_20px] bg-[var(--surface-muted)] sm:min-h-[380px]">
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"
            alt="A table filled with colourful Pakistani dishes to share"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
            <p className="esr-eyebrow">Good food. Great company.</p>
            <p className="esr-serif mt-1 text-2xl font-bold sm:text-3xl">More flavour. More value.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Restaurant listings">
        {([
          ['featured', 'Featured'],
          ['nearby', 'Near me'],
          ['latest', 'Latest discounts'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={browseTab === id}
            disabled={id === 'nearby' && locLoading}
            onClick={() => {
              setBrowseTab(id)
              setActiveCategory('all')
              if (id === 'nearby') {
                handleLocationFilter('nearby')
              } else {
                clearLocationFilter()
              }
            }}
            className={`esr-chip ${browseTab === id ? 'border-[var(--plum)] bg-[var(--plum)] text-white' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {ads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ads.map((ad) => {
            const card = (
              <div className="relative h-36 rounded-2xl overflow-hidden border border-red-100 bg-red-50">
                {ad.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm font-bold text-red-700 px-4 text-center">
                    {ad.title}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-sm font-bold">{ad.title}</p>
                </div>
              </div>
            )
            return ad.deeplink ? (
              <a key={ad.id} href={ad.deeplink} target="_blank" rel="noreferrer">
                {card}
              </a>
            ) : (
              <div key={ad.id}>{card}</div>
            )
          })}
        </div>
      )}

      {(featured.length > 0 || bumper.length > 0) && (
        <DealStripCarousel featured={featured} bumper={bumper} onClaim={handleOpenClaimModal} />
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xs sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="restaurant-search" className="sr-only">Search restaurants, cuisine, or area</label>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            <input
              id="restaurant-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Restaurant, cuisine or area — e.g. Gulberg"
              className="w-full border-0 bg-transparent py-3 pl-11 pr-4 text-base font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0"
            />
          </div>
          <div className="relative border-t border-[var(--border)] sm:border-l sm:border-t-0">
            <label htmlFor="restaurant-city" className="sr-only">Filter by city</label>
            <select
              id="restaurant-city"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="h-full min-h-12 w-full appearance-none bg-[var(--surface-muted)] py-3 pl-4 pr-10 text-sm font-semibold text-[var(--plum)] focus-visible:relative focus-visible:z-10 sm:w-48"
            >
              {CITY_FILTERS.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--plum)]" size={16} />
          </div>
        </div>

        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            aria-expanded={showFilterDropdown}
            aria-controls="discount-filter-options"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 px-5 py-3 border rounded-2xl text-xs font-bold transition-all shadow-xs ${
              selectedDiscount !== 'all' || showFilterDropdown
                ? 'bg-red-100 border-red-600 text-red-600'
                : 'bg-red-50/80 border-red-200 text-red-950 hover:bg-red-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={16} className={selectedDiscount !== 'all' ? 'text-red-600' : 'text-red-900'} />
              <span>{selectedDiscount === 'all' ? 'Sort' : currentDiscountLabel}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showFilterDropdown && (
            <div id="discount-filter-options" className="absolute top-full right-0 mt-2 w-full sm:w-60 bg-white border border-red-100 rounded-2xl shadow-xl z-30 py-2">
              <p className="px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
                Discount Rate
              </p>
              {DISCOUNT_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={selectedDiscount === r.id}
                  onClick={() => {
                    setSelectedDiscount(r.id)
                    setShowFilterDropdown(false)
                  }}
                  className={`min-h-11 w-full px-4 py-2.5 text-left text-sm font-bold transition-colors ${
                    selectedDiscount === r.id ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-red-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by cuisine">
        {CUISINE_FILTERS.map((cuisine) => (
          <button
            key={cuisine}
            type="button"
            aria-pressed={activeCuisine === cuisine}
            onClick={() => setActiveCuisine(cuisine)}
            className={`esr-chip ${activeCuisine === cuisine ? 'border-[var(--plum)] bg-[var(--plum)] text-white' : ''}`}
          >
            {cuisine}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          aria-pressed={activeCategory === 'all' && !topRestaurantsActive && !nearbyRestaurantsActive}
          onClick={() => {
            clearLocationFilter()
            setActiveCategory('all')
          }}
          className={`text-xs font-bold px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap ${
            activeCategory === 'all' && !topRestaurantsActive && !nearbyRestaurantsActive
              ? 'bg-red-50 text-red-600 border border-red-300 shadow-xs'
              : 'bg-red-50/40 text-gray-700 hover:bg-red-50 border border-transparent'
          }`}
        >
          <span>All Offers</span>
        </button>

        <button
          type="button"
          aria-pressed={topRestaurantsActive}
          onClick={() => {
            setActiveCategory('all')
            handleLocationFilter('top')
          }}
          disabled={locLoading}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap ${
            topRestaurantsActive
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-red-50/40 text-gray-700 hover:bg-red-50 border border-transparent'
          }`}
        >
          <MapPin size={14} className={topRestaurantsActive ? 'text-white' : 'text-red-600'} />
          <span>Top Restaurants</span>
        </button>

        <button
          type="button"
          aria-pressed={nearbyRestaurantsActive}
          onClick={() => {
            setActiveCategory('all')
            handleLocationFilter('nearby')
          }}
          disabled={locLoading}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap ${
            nearbyRestaurantsActive
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-red-50/40 text-gray-700 hover:bg-red-50 border border-transparent'
          }`}
        >
          <MapPin size={14} className={nearbyRestaurantsActive ? 'text-white' : 'text-red-600'} />
          <span>Nearby Restaurants</span>
        </button>

        <button
          type="button"
          aria-pressed={activeCategory === 'verified-reviews'}
          onClick={() => setActiveCategory('verified-reviews')}
          className={`text-xs font-bold px-3.5 py-2 rounded-2xl transition-all whitespace-nowrap ${
            activeCategory === 'verified-reviews'
              ? 'bg-red-50 text-red-600 border border-red-300 shadow-xs'
              : 'bg-red-50/40 text-gray-700 hover:bg-red-50 border border-transparent'
          }`}
        >
          <span>Verified Reviews</span>
        </button>
      </div>

      {activeCategory === 'verified-reviews' && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-black text-gray-900">Verified Customer Reviews</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VERIFIED_REVIEWS.map((rev) => (
              <div key={rev.id} className="bg-white rounded-2xl border border-red-100 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-red-100">
                      <Image src={rev.userAvatar} alt={rev.userName} fill className="object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{rev.userName}</h4>
                      <p className="text-xs text-gray-400">{rev.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg text-xs font-extrabold">
                    <Star size={12} className="fill-amber-500" />
                    <span>{rev.rating}.0</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-600">{rev.dishName} • {rev.restaurantName}</p>
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed">{rev.reviewText}</p>
                </div>
                <div className="relative h-44 rounded-xl overflow-hidden bg-gray-100">
                  <Image src={rev.image} alt={rev.dishName} fill className="object-cover" />
                </div>
                <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                  ✓ Photo & Order Receipt Verified
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(activeCategory === 'all' || activeCategory === 'saved' || topRestaurantsActive || nearbyRestaurantsActive) && (
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-black text-gray-900">
              {activeCategory === 'saved' ? 'Saved Offers' : topRestaurantsActive ? 'Top Restaurants' : nearbyRestaurantsActive ? 'Nearby Restaurants' : search ? `Results for "${search}"` : 'All Restaurant Offers'}
            </h2>
            <span aria-live="polite" aria-atomic="true" className="text-sm font-bold text-[var(--plum)] bg-[var(--surface-muted)] px-3 py-1 rounded-full">
              {filtered.length}
              <span className="sr-only"> matching offers</span>
            </span>
          </div>

          {locLoading && locMode ? (
            <PageLoader
              label={
                locMode === 'top'
                  ? 'Finding top restaurants near you…'
                  : 'Locating restaurants within 250m…'
              }
            />
          ) : filtered.length === 0 ? (
            <div aria-live="polite" className="rounded-3xl border border-dashed border-[var(--border)] bg-white/70 py-16 text-center">
              <div className="mb-3 text-5xl" aria-hidden="true">🍽️</div>
              <p className="font-semibold text-[var(--plum)]">
                {activeCategory === 'saved' ? 'You have not saved any offers yet.' : 'No restaurants match your filters.'}
              </p>
              {activeCategory !== 'saved' && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setSelectedCity('All cities')
                    setActiveCuisine('All')
                    setSelectedDiscount('all')
                    setBrowseTab('featured')
                    clearLocationFilter()
                  }}
                  className="esr-primary-button mt-4 px-5 py-2.5"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((offer, idx) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  index={idx}
                  discountPct={discountPct(offer)}
                  isSaved={savedOfferIds.has(offer.id)}
                  claimed={claimedOfferIds.has(offer.id)}
                  onToggleSave={(e) => handleToggleSave(e, offer)}
                  onClaim={handleOpenClaimModal}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedClaimOffer && modalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-red-100 animate-in fade-in zoom-in-95 duration-200">
            {modalStep === 'review' && (
              <div>
                <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white p-5 text-center">
                  <button
                    onClick={() => {
                      setModalStep(null)
                      setSelectedClaimOffer(null)
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 text-white">
                    <MessageSquarePlus size={24} />
                  </div>
                  <h3 className="font-black text-xl">Review to Unlock Voucher</h3>
                  <p className="text-xs text-red-100">Share your review for {selectedClaimOffer.restaurants?.name} first. Future claims for this spot will unlock instantly!</p>
                </div>

                <form onSubmit={handleSendReviewAndProceed} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Rate your experience</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="p-1 focus:outline-none"
                        >
                          <Star
                            size={24}
                            className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-black text-amber-600 ml-2">{reviewRating}.0 Stars</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Your Review & Feedback</label>
                    <textarea
                      required
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="How was the food, ambiance, or service?"
                      rows={3}
                      className="w-full p-3 bg-red-50/50 border border-red-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800 placeholder:text-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <span>Saving Review...</span>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Submit Review & Claim Voucher</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {modalStep === 'claim' && (
              <div>
                <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white p-5 text-center">
                  <button
                    onClick={() => {
                      setModalStep(null)
                      setSelectedClaimOffer(null)
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 text-white">
                    <Ticket size={24} />
                  </div>
                  <h3 className="font-black text-xl">Voucher Unlocked!</h3>
                  <p className="text-xs text-red-100">Show this code at checkout to enjoy your deal.</p>
                </div>

                <div className="p-6 space-y-5 text-center">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
                      {selectedClaimOffer.restaurants?.name}
                    </p>
                    <h4 className="text-base font-extrabold text-gray-900 mt-0.5">
                      {selectedClaimOffer.name}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-lg font-black text-red-600">
                        Rs. {selectedClaimOffer.discounted_price}
                      </span>
                      {selectedClaimOffer.original_price > 0 && (
                        <span className="text-xs text-gray-400 line-through">
                          Rs. {selectedClaimOffer.original_price}
                        </span>
                      )}
                      <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {discountPct(selectedClaimOffer)}% OFF
                      </span>
                    </div>
                  </div>

                  <div className="bg-red-50/70 border-2 border-dashed border-red-300 rounded-2xl p-4 relative space-y-1">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                      Show this code at checkout
                    </p>
                    <div className="text-2xl font-black text-gray-900 tracking-wider">
                      {isClaiming ? 'Claiming…' : activeVoucherCode || claimError || '—'}
                    </div>
                    {activeVoucherCode && (
                      <p className="flex items-center justify-center gap-1 text-xs font-bold text-red-600">
                        <Clock size={13} />
                        Refreshes in {voucherCountdown}
                      </p>
                    )}

                    {activeVoucherCode && (
                    <button
                      onClick={() => copyCouponCode(activeVoucherCode)}
                      className="mt-2 inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-all"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied Code!' : 'Copy Code'}</span>
                    </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 font-medium">
                    This ESR- code is unique to this offer and refreshes every 30 minutes. Staff see the same code in admin.
                  </p>

                  <button
                    onClick={() => {
                      setModalStep(null)
                      setSelectedClaimOffer(null)
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-colors shadow-md"
                  >
                    Done / Back to Offers
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DealStripCarousel({
  featured,
  bumper,
  onClaim,
}: {
  featured: OfferWithRestaurant[]
  bumper: OfferWithRestaurant[]
  onClaim: (offer: OfferWithRestaurant) => void
}) {
  const items = [
    ...featured.map((offer) => ({ offer, kind: 'featured' as const })),
    ...bumper.map((offer) => ({ offer, kind: 'bumper' as const })),
  ]
  if (items.length === 0) return null

  const loop = items.length < 6 ? [...items, ...items, ...items, ...items] : [...items, ...items]
  const durationSec = Math.max(22, loop.length * 2.8)

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max flex-nowrap gap-3 animate-esr-marquee"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {loop.map((item, index) => {
          const isBumper = item.kind === 'bumper'
          return (
            <button
              key={`${item.kind}-${item.offer.id}-${index}`}
              type="button"
              onClick={() => onClaim(item.offer)}
              className={`flex w-[220px] shrink-0 flex-col rounded-2xl border p-3 text-left shadow-xs transition-shadow hover:shadow-md ${
                isBumper
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-100 bg-white'
              }`}
            >
              <p className={`text-[10px] font-extrabold uppercase ${isBumper ? 'text-amber-700' : 'text-red-600'}`}>
                {isBumper ? 'Bumper deal' : 'Featured'}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{item.offer.name}</p>
              <p className="text-xs text-gray-500">{item.offer.restaurants?.name}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OfferCard({
  offer,
  index,
  discountPct,
  isSaved,
  claimed,
  onToggleSave,
  onClaim,
}: {
  offer: OfferWithRestaurant
  index: number
  discountPct: number
  isSaved?: boolean
  claimed?: boolean
  onToggleSave?: (e: React.MouseEvent) => void
  onClaim?: (offer: OfferWithRestaurant) => void
}) {
  const restaurantName = offer.restaurants?.name || offer.name
  const assignedImage =
    offer.restaurants?.cover_url ||
    offer.restaurants?.logo_url ||
    offer.image_url ||
    null

  const photoVerified =
    Boolean(assignedImage) &&
    (Boolean((offer as { photo_verified?: boolean }).photo_verified) ||
      assignedImage!.includes('/api/restaurants/photo') ||
      assignedImage!.includes('googleusercontent.com'))

  const needsUnoptimized =
    Boolean(assignedImage) &&
    (assignedImage!.startsWith('/api/') ||
      assignedImage!.includes('maps.googleapis.com') ||
      assignedImage!.includes('places.googleapis.com') ||
      assignedImage!.includes('commons.wikimedia.org'))

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xs transition-shadow duration-300 hover:shadow-lg">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-red-100 via-orange-50 to-amber-100">
        {assignedImage ? (
          <Image
            src={assignedImage}
            alt={`Food at ${restaurantName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={needsUnoptimized}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-700/80 px-4 text-center">
            <span className="text-4xl font-black opacity-40 mb-1">
              {restaurantName.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold">{restaurantName}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {discountPct > 0 && (
            <span className="rounded-full bg-[#fff0ed] px-3 py-1.5 text-xs font-extrabold uppercase text-[var(--plum)] shadow-sm">
              {discountPct}% off
            </span>
          )}
          {photoVerified && (
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-400" />
              <span>Photo Verified</span>
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={`Save ${restaurantName}`}
          aria-pressed={Boolean(isSaved)}
          onClick={(e) => onToggleSave?.(e)}
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-xs backdrop-blur-md transition-colors hover:bg-white"
        >
          <Heart
            size={16}
            className={`transition-colors ${
              isSaved ? 'fill-red-600 text-red-600' : 'text-gray-400 hover:text-red-600'
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
            <span>{offer.restaurants?.categories?.name || 'Restaurant'}</span>
            {(offer.restaurants?.address || offer.restaurants?.city) && <span aria-hidden="true">·</span>}
            {offer.restaurants?.address && <span className="truncate">{offer.restaurants.address}</span>}
            {offer.restaurants?.city && <span>{offer.restaurants.city}</span>}
          </div>

          <h3 className="esr-serif text-xl font-bold leading-snug">
            {restaurantName}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{offer.name}</p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-dashed border-[var(--border)] pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-[var(--crimson)]">PKR {offer.discounted_price}</span>
            {offer.original_price > 0 && (
              <span className="text-sm text-[var(--muted)] line-through">PKR {offer.original_price}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onClaim?.(offer)}
            aria-label={`${claimed ? 'View claimed voucher for' : 'Claim voucher for'} ${restaurantName}`}
            className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold hover:underline ${
              claimed ? 'text-emerald-800' : 'text-[var(--crimson)]'
            }`}
          >
            {claimed ? 'Voucher claimed' : 'Claim voucher'} <Ticket aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}