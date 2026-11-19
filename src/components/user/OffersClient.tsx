'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { Heart, ChevronDown } from 'lucide-react'
import { toggleSaveOffer, createClient } from '@/lib/supabase/client'
import type { AdminAd, Offer } from '@/types/database'
import { toast } from 'sonner'
import { PageLoader } from '@/components/ui/loader'
import RestaurantDetailView from '@/components/user/RestaurantDetailView'

export interface OfferWithRestaurant extends Offer {
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
    description?: string | null
    country?: string | null
    phone_number?: string | null
    opening_hours?: string | null
    website?: string | null
    image_url?: string | null
    tags?: string[] | null
    restaurant_type?: string | null
    categories: { name: string } | null
  } | null
}

interface Props {
  ads?: AdminAd[]
  featured?: OfferWithRestaurant[]
  bumper?: OfferWithRestaurant[]
  initialOffers?: OfferWithRestaurant[]
  initialError?: string
}

const discountPct = (o: Offer) =>
  o.original_price > 0 ? Math.ceil(100 - (o.discounted_price / o.original_price) * 100) : 0

const normalizeFilterValue = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const CUISINE_FILTERS = ['All', 'Pakistani', 'Burgers', 'Continental', 'BBQ', 'Cafés', 'Pizza']
const CITY_FILTERS = ['All cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar']

async function fetchNearbyRestaurants(lat: number, lng: number) {
  const res = await fetch(`/api/restaurants/nearby?lat=${lat}&lng=${lng}&mode=nearby`)
  const data = await res.json()
  if (res.ok && Array.isArray(data)) return data as OfferWithRestaurant[]
  return []
}

export default function OffersClient({ ads = [], featured = [], bumper = [], initialOffers = [], initialError = '' }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(tabParam || 'all')
  const [activeCuisine, setActiveCuisine] = useState('All')
  const [selectedCity, setSelectedCity] = useState('All cities')
  const [browseTab, setBrowseTab] = useState<'featured' | 'nearby' | 'latest'>('featured')
  const [reviewedRestaurantIds, setReviewedRestaurantIds] = useState<Set<string>>(new Set())
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const detailScrollPosition = useRef(0)
  const openedFromDiscover = useRef(false)
  const lastRestaurantLink = useRef<HTMLAnchorElement | null>(null)
  const lastRecordedRestaurant = useRef<string | null>(null)

  useEffect(() => {
    if (tabParam === 'foodies-feed') {
      router.replace('/user/foodies-feed')
      return
    }
    // Keep the selected Discover view aligned with URL navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCategory(tabParam === 'saved' ? 'saved' : 'all')
  }, [tabParam, router])

  const [offers, setOffers] = useState<OfferWithRestaurant[]>(initialOffers)
  const [nearbyOffers, setNearbyOffers] = useState<OfferWithRestaurant[]>([])
  const [nearbyRestaurantsActive, setNearbyRestaurantsActive] = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [locMode, setLocMode] = useState<'nearby' | null>(null)
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set())
  const [claimedOfferIds, setClaimedOfferIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authPrompt, setAuthPrompt] = useState('')
  const [loadError, setLoadError] = useState(initialError)

  useEffect(() => {
    // Reconcile realtime offer changes with refreshed server data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffers(initialOffers)
  }, [initialOffers])

  useEffect(() => {
    const readRestaurantHash = () => {
      const match = window.location.hash.match(/^#restaurant\/(.+)$/)
      const restaurantId = match ? decodeURIComponent(match[1]) : null
      setSelectedRestaurantId(restaurantId)
      if (!restaurantId) {
        document.title = 'Discover restaurants | ESR'
        if (openedFromDiscover.current) {
          window.scrollTo({ top: detailScrollPosition.current, behavior: 'instant' })
          requestAnimationFrame(() => lastRestaurantLink.current?.focus({ preventScroll: true }))
        }
      }
    }

    readRestaurantHash()
    window.addEventListener('hashchange', readRestaurantHash)
    window.addEventListener('popstate', readRestaurantHash)
    return () => {
      window.removeEventListener('hashchange', readRestaurantHash)
      window.removeEventListener('popstate', readRestaurantHash)
    }
  }, [])

  useEffect(() => {
    if (!selectedRestaurantId) return
    const restaurant = [...offers, ...nearbyOffers].find(
      (offer) => offer.restaurants?.id === selectedRestaurantId
    )?.restaurants
    if (restaurant) document.title = `${restaurant.name} · ESR`
  }, [nearbyOffers, offers, selectedRestaurantId])

  useEffect(() => {
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
            '*, restaurants!inner(id, name, city, address, country, description, phone_number, opening_hours, lat, lng, cover_url, image_url, logo_url, is_featured, tags, restaurant_type, website, categories(name))'
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
  }, [router])

  const applyNearbyResults = (data: OfferWithRestaurant[], options?: { activate?: boolean }) => {
    setNearbyOffers(data)
    const shouldActivate = options?.activate !== false
    if (!shouldActivate) return
    setNearbyRestaurantsActive(true)
  }

  const handleLocationFilter = (
    mode: 'nearby',
    options?: { silent?: boolean; activateOnSuccess?: boolean; highlightChip?: boolean }
  ) => {
    const activateOnSuccess = options?.activateOnSuccess !== false
    const highlightChip = options?.highlightChip ?? !options?.silent

    if (highlightChip) setNearbyRestaurantsActive(true)

    setLocMode(mode)
    setLocLoading(true)

    const finishWithoutLocation = (message: string) => {
      setNearbyOffers([])
      setNearbyRestaurantsActive(false)
      setLocMode(null)
      setLocLoading(false)
      if (!options?.silent) {
        toast.error(message)
      }
    }

    const loadByCoords = async (lat: number, lng: number) => {
      try {
        const data = await fetchNearbyRestaurants(lat, lng)
        applyNearbyResults(data, { activate: activateOnSuccess })
        if (activateOnSuccess && !options?.silent) {
          toast.success(`Found ${data.length} nearby restaurants`)
        }
      } catch (err) {
        console.error('Failed to load nearby restaurants:', err)
        setNearbyOffers([])
        if (highlightChip || activateOnSuccess) setNearbyRestaurantsActive(false)
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
    async function loadUserData() {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setLoadError(authError.message)
        setAuthReady(true)
        return
      }
      if (user) {
        setUserId(user.id)
        const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const [{ data, error: savedError }, { data: claimed, error: claimedError }, { data: reviewed, error: reviewsError }] = await Promise.all([
          supabase.from('user_offers').select('offer_id').eq('user_id', user.id),
          supabase.from('user_coupons').select('offer_id').eq('user_id', user.id).gte('used_at', ago24h),
          supabase.from('reviews').select('restaurant_id').eq('user_id', user.id),
        ])
        const resultError = savedError || claimedError || reviewsError
        if (resultError) {
          setLoadError(resultError.message)
          setAuthReady(true)
          return
        }
        if (claimed) {
          setClaimedOfferIds(new Set(claimed.map((row) => row.offer_id).filter(Boolean)))
        }
        if (data) {
          setSavedOfferIds(new Set(data.map((item) => item.offer_id)))
        }
        if (reviewed) setReviewedRestaurantIds(new Set(reviewed.map((review) => review.restaurant_id)))
      }
      setAuthReady(true)
    }
    void loadUserData()
  }, [])

  const activeOffersList = activeCategory === 'saved'
    ? [...offers, ...nearbyOffers].filter(
        (o, index, arr) => savedOfferIds.has(o.id) && arr.findIndex((x) => x.id === o.id) === index
      )
    : (nearbyRestaurantsActive ? nearbyOffers : offers)

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

    return matchesSearch && matchesCity && matchesCuisine && matchesBrowseTab
  }).sort((a, b) => {
    if (browseTab !== 'latest') return 0
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  const filteredRestaurants = filtered.filter(
    (offer, index, list) =>
      list.findIndex((item) => item.restaurants?.id === offer.restaurants?.id) === index
  )

  const clearLocationFilter = () => {
    setNearbyRestaurantsActive(false)
    setNearbyOffers([])
  }

  const handleToggleSave = async (e: React.MouseEvent, offer: OfferWithRestaurant) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      setAuthPrompt('Sign in to save restaurants and offers.')
      return
    }

    const offerId = offer.id
    const isSaved = savedOfferIds.has(offerId)
    const { error } = await toggleSaveOffer(userId, offerId, isSaved)
    if (error) {
      console.error('Failed to save offer:', error)
      toast.error('Could not update your saved offers.')
      return
    }
    setSavedOfferIds((current) => {
      const next = new Set(current)
      if (isSaved) next.delete(offerId)
      else next.add(offerId)
      return next
    })
    setAuthPrompt('')
    toast.success(isSaved ? 'Removed from saved' : 'Saved to favourites')
  }

  const openRestaurant = (offer: OfferWithRestaurant, link?: HTMLAnchorElement) => {
    const restaurantId = offer.restaurants?.id
    if (!restaurantId) return

    detailScrollPosition.current = window.scrollY
    openedFromDiscover.current = true
    lastRestaurantLink.current = link || null
    window.history.pushState(null, '', `#restaurant/${encodeURIComponent(restaurantId)}`)
    setSelectedRestaurantId(restaurantId)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  useEffect(() => {
    if (!authReady) return
    if (!selectedRestaurantId) {
      lastRecordedRestaurant.current = null
      return
    }
    if (lastRecordedRestaurant.current === selectedRestaurantId) return
    lastRecordedRestaurant.current = selectedRestaurantId

    if (userId) {
      const supabase = createClient()
      void supabase.from('restaurant_views').insert({
        user_id: userId,
        restaurant_id: selectedRestaurantId,
      }).then(({ error }) => {
        if (error) console.error('Could not save restaurant view:', error)
      })
    }
  }, [authReady, selectedRestaurantId, userId])

  const returnToDiscover = () => {
    if (openedFromDiscover.current) {
      window.history.back()
      return
    }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    setSelectedRestaurantId(null)
  }

  const allOffers = [...offers, ...nearbyOffers].filter(
    (offer, index, list) => list.findIndex((item) => item.id === offer.id) === index
  )
  const selectedOffer = selectedRestaurantId
    ? allOffers.find((offer) => offer.restaurants?.id === selectedRestaurantId)
    : undefined
  const selectedRestaurant = selectedOffer?.restaurants
  const restaurantOffers = selectedRestaurant
    ? allOffers.filter((offer) => offer.restaurants?.id === selectedRestaurant.id)
    : []

  if (selectedRestaurant) {
    return (
      <RestaurantDetailView
        key={selectedRestaurant.id}
        restaurant={selectedRestaurant}
        offers={restaurantOffers}
        userId={userId}
        claimedOfferIds={claimedOfferIds}
        reviewedRestaurantIds={reviewedRestaurantIds}
        onClaimed={(offerId) => setClaimedOfferIds((current) => new Set(current).add(offerId))}
        onReviewed={(restaurantId) =>
          setReviewedRestaurantIds((current) => new Set(current).add(restaurantId))
        }
        onBack={returnToDiscover}
      />
    )
  }

  return (
    <div className="esr-discover relative mx-auto max-w-[1140px] space-y-8 px-4 py-6 sm:px-6 lg:py-10">
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

      {loadError && (
        <p role="alert" className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--plum)]">
          Restaurant data could not be loaded: {loadError}
        </p>
      )}
      {authPrompt && (
        <p role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--plum)]">
          {authPrompt}{' '}
          <a href="/auth/login?next=%2Fuser%2Foffers" className="font-semibold text-[var(--crimson)] underline underline-offset-2">Login</a>
          {' '}or{' '}
          <a href="/auth/signup" className="font-semibold text-[var(--crimson)] underline underline-offset-2">sign up</a>.
        </p>
      )}

      {ads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ads.map((ad) => {
            const card = (
              <div className="relative h-36 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                {ad.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-[var(--plum)]">
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
        <DealStripCarousel featured={featured} bumper={bumper} onOpen={openRestaurant} />
      )}

      <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="restaurant-search" className="sr-only">Search restaurants, cuisine, or area</label>
            <input
              id="restaurant-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Restaurant, cuisine or area"
              className="min-h-14 w-full border-0 bg-transparent px-4 py-3 text-base font-normal text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--crimson)]"
            />
          </div>
          <div className="relative m-1.5 rounded-xl bg-[var(--surface-muted)] sm:ml-0 sm:rounded-l-none">
            <label htmlFor="restaurant-city" className="sr-only">Filter by city</label>
            <select
              id="restaurant-city"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="h-full min-h-12 w-full appearance-none rounded-xl border-0 bg-transparent py-3 pl-4 pr-10 text-sm font-medium text-[var(--plum)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--crimson)] sm:w-48"
            >
              {CITY_FILTERS.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--plum)]" size={16} />
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

      {(activeCategory === 'all' || activeCategory === 'saved' || nearbyRestaurantsActive) && (
        <section className="pt-2">
          <div className="mb-5">
            <p className="esr-eyebrow">Local flavours, lovely savings</p>
            <h2 className="esr-serif mt-2 text-3xl font-normal sm:text-4xl">Find a table worth sharing.</h2>
            <span aria-live="polite" aria-atomic="true" className="sr-only">
              {filteredRestaurants.length} matching restaurants
            </span>
            <span aria-hidden="true" className="mt-3 inline-flex rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-medium text-[var(--plum)]">
              {filteredRestaurants.length} restaurants
            </span>
          </div>

          {locLoading && locMode ? (
            <PageLoader
              label={
                locMode === 'nearby'
                  ? 'Finding restaurants near you…'
                  : 'Loading restaurants…'
              }
            />
          ) : filteredRestaurants.length === 0 ? (
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
            <div className="grid auto-rows-fr grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  discountPct={discountPct(offer)}
                  isSaved={savedOfferIds.has(offer.id)}
                  onToggleSave={(e) => handleToggleSave(e, offer)}
                  onOpen={(event) => openRestaurant(offer, event.currentTarget)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function DealStripCarousel({
  featured,
  bumper,
  onOpen,
}: {
  featured: OfferWithRestaurant[]
  bumper: OfferWithRestaurant[]
  onOpen: (offer: OfferWithRestaurant) => void
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
              onClick={() => onOpen(item.offer)}
              className={`flex w-[220px] shrink-0 flex-col rounded-2xl border p-3 text-left shadow-xs transition-shadow hover:shadow-md ${
                isBumper
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-[var(--border)] bg-white'
              }`}
            >
              <p className={`text-xs font-semibold uppercase ${isBumper ? 'text-amber-800' : 'text-[var(--crimson)]'}`}>
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
  discountPct,
  isSaved,
  onToggleSave,
  onOpen,
}: {
  offer: OfferWithRestaurant
  discountPct: number
  isSaved?: boolean
  onToggleSave?: (e: React.MouseEvent) => void
  onOpen: (event: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const restaurantName = offer.restaurants?.name || offer.name
  const assignedImage =
    offer.restaurants?.cover_url ||
    offer.restaurants?.logo_url ||
    offer.image_url ||
    null
  const needsUnoptimized =
    Boolean(assignedImage) &&
    (assignedImage!.startsWith('/api/') ||
      assignedImage!.includes('maps.googleapis.com') ||
      assignedImage!.includes('places.googleapis.com') ||
      assignedImage!.includes('commons.wikimedia.org'))

  const cuisine = offer.restaurants?.categories?.name || 'Restaurant'
  const locationLine = `${cuisine} · ${offer.restaurants?.address || offer.restaurants?.city || ''}${offer.restaurants?.address && offer.restaurants?.city ? `, ${offer.restaurants.city}` : ''}`

  return (
    <article className="esr-restaurant-card group relative flex h-full flex-col overflow-hidden rounded-[19px] border border-[var(--border)] bg-white">
      <a
        href={`#restaurant/${encodeURIComponent(offer.restaurants?.id || offer.restaurant_id)}`}
        aria-label={`Explore ${restaurantName}`}
        onClick={(event) => {
          event.preventDefault()
          onOpen(event)
        }}
        className="flex h-full flex-col rounded-[18px] text-left text-inherit focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--crimson)]"
      >
        <div className="relative aspect-[11/6] w-full shrink-0 bg-[var(--surface-muted)]">
          {assignedImage ? (
            <Image
              src={assignedImage}
              alt={`Food at ${restaurantName}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              unoptimized={needsUnoptimized}
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-4xl text-[var(--muted)]" aria-hidden="true">
              {restaurantName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--plum)]">
            {discountPct}% OFF · DINE-IN
          </span>
        </div>
        <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
          <h3 className="esr-serif text-2xl font-normal leading-snug">{restaurantName}</h3>
          <p className="mt-1 min-h-6 text-sm leading-6 text-[var(--muted)]">{locationLine}</p>
          <div className="mt-auto flex min-h-14 items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
            <span className="text-sm font-semibold text-[var(--crimson)]">
              Approx. PKR {offer.discounted_price.toLocaleString('en-US')} / person
            </span>
            <span className="shrink-0 text-sm font-semibold text-[var(--crimson)]">Explore ↗</span>
          </div>
        </div>
      </a>
      <button
        type="button"
        aria-label={`Save ${restaurantName}`}
        aria-pressed={Boolean(isSaved)}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggleSave?.(event)
        }}
        className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--plum)] shadow-sm transition-colors hover:bg-[var(--surface-muted)]"
      >
        <Heart aria-hidden="true" size={19} className={isSaved ? 'fill-[var(--crimson)] text-[var(--crimson)]' : ''} />
      </button>
    </article>
  )
}