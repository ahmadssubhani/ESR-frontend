import { NextResponse } from 'next/server'
import {
  fetchGoogleNearbyRestaurants,
  findGooglePhotoForName,
  getGooglePlacesKey,
  isGooglePlacesAvailable,
  placeCategory,
} from '@/lib/google-places'
import {
  ADMIN_SYNC_RADIUS_M,
  TOP_RESTAURANTS_RADIUS_M,
  WEBSITE_NEARBY_RADIUS_M,
  distanceMeters,
} from '@/lib/geo'
import { syncNearbyPlacesToCatalog, type NearbyPlaceInput, type SyncedNearbyPlace } from '@/lib/sync-nearby-restaurants'

type GeoFeature = {
  properties?: {
    name?: string
    formatted?: string
    lat?: number
    lon?: number
    place_id?: string
    categories?: string[]
  }
}

const DISCOUNT_TIERS = [10, 12, 15, 18, 20, 22, 25, 28, 30, 33, 35, 40, 45, 50]
const ORIGINAL_PRICE_OPTIONS = [
  899, 999, 1199, 1299, 1499, 1599, 1799, 1899, 1999, 2199, 2499, 2799, 2999, 3499, 3999,
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function dealPricingFor(seed: string) {
  const h = hashString(`${seed}|deal`)
  const discountPct = DISCOUNT_TIERS[h % DISCOUNT_TIERS.length]
  const original = ORIGINAL_PRICE_OPTIONS[(h >> 4) % ORIGINAL_PRICE_OPTIONS.length]
  const discounted = Math.max(
    199,
    Math.round((original * (100 - discountPct)) / 100 / 10) * 10
  )
  return { original_price: original, discounted_price: discounted, discount_pct: discountPct }
}

async function fetchGeoapifyPlaces(
  apiKey: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  limit: number
): Promise<GeoFeature[]> {
  const fetchWithRadius = async (radius: number) => {
    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=catering.restaurant,catering.cafe,catering.fast_food` +
      `&filter=circle:${lng},${lat},${radius}` +
      `&bias=proximity:${lng},${lat}` +
      `&limit=${limit}` +
      `&apiKey=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Geoapify HTTP ${response.status}`)
    const data = await response.json()
    return (data.features || []) as GeoFeature[]
  }

  let features = await fetchWithRadius(radiusMeters)
  if (features.length === 0 && radiusMeters < 20000) {
    features = await fetchWithRadius(20000)
  }
  return features
}

function toOffer(input: {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
  category: string
  photoUrl: string | null
  photoVerified: boolean
  restaurantId?: string
}) {
  const pricing = dealPricingFor(input.id)
  const rating =
    input.rating != null
      ? input.rating.toFixed(1)
      : (3.8 + (hashString(input.id) % 13) / 10).toFixed(1)
  const restaurantId = input.restaurantId || `rest-${input.id}`

  return {
    id: input.id,
    name: `Special Deal at ${input.name}`,
    description: `Verified top spot at ${input.address}. Rated ${rating}★ online.`,
    original_price: pricing.original_price,
    discounted_price: pricing.discounted_price,
    discount_pct: pricing.discount_pct,
    image_url: input.photoUrl,
    restaurant_id: restaurantId,
    created_at: new Date().toISOString(),
    is_external: !input.restaurantId,
    photo_verified: input.photoVerified,
    restaurants: {
      id: restaurantId,
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      cover_url: input.photoUrl,
      logo_url: null,
      categories: { name: input.category },
    },
  }
}

function displayRadius(mode: string) {
  return mode === 'top' ? TOP_RESTAURANTS_RADIUS_M : WEBSITE_NEARBY_RADIUS_M
}

function fetchRadius(mode: string) {
  return mode === 'top' ? TOP_RESTAURANTS_RADIUS_M : ADMIN_SYNC_RADIUS_M
}

async function attachCatalogAndFilter(
  userLat: number,
  userLng: number,
  mode: string,
  places: NearbyPlaceInput[]
) {
  let synced: SyncedNearbyPlace[] = []
  try {
    synced = await syncNearbyPlacesToCatalog(userLat, userLng, places)
  } catch (error) {
    console.error('Nearby catalog sync skipped:', error)
    synced = places.map((place) => ({ ...place, restaurant: null, offer: null, created: false }))
  }

  const maxDistance = displayRadius(mode)
  const visible = synced.filter(
    (place) => distanceMeters(userLat, userLng, place.lat, place.lng) <= maxDistance
  )

  let offers = visible.map((place) => {
    if (place.offer && place.restaurant) {
      const original = Number(place.offer.original_price) || 0
      const discounted = Number(place.offer.discounted_price) || 0
      return {
        id: place.offer.id,
        name: place.offer.name,
        description: place.offer.description,
        original_price: original,
        discounted_price: discounted,
        discount_pct: original > 0 ? Math.ceil(100 - (discounted / original) * 100) : 0,
        image_url: place.offer.image_url || place.photoUrl,
        restaurant_id: place.restaurant.id,
        created_at: new Date().toISOString(),
        is_external: false,
        photo_verified: Boolean(place.photoUrl),
        restaurants: {
          id: place.restaurant.id,
          name: place.restaurant.name,
          lat: place.restaurant.lat,
          lng: place.restaurant.lng,
          cover_url: place.restaurant.cover_url || place.photoUrl,
          logo_url: place.restaurant.logo_url,
          categories: place.restaurant.categories || { name: place.category || 'restaurant' },
        },
      }
    }

    return toOffer({
      id: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      rating: null,
      category: place.category || 'restaurant',
      photoUrl: place.photoUrl || null,
      photoVerified: Boolean(place.photoUrl),
      restaurantId: place.restaurant?.id,
    })
  })

  offers = offers.sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
  if (mode === 'top') {
    offers = offers.sort((a, b) => b.discount_pct - a.discount_pct)
  }
  return offers
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const latStr = searchParams.get('lat')
    const lngStr = searchParams.get('lng')
    const mode = searchParams.get('mode') || 'nearby'

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 })
    }

    const googleKey = getGooglePlacesKey()
    const radiusMeters = fetchRadius(mode)

    if (googleKey) {
      const googlePlaces = await fetchGoogleNearbyRestaurants(lat, lng, {
        mode,
        radiusMeters,
        limit: 24,
      })
      if (googlePlaces.length > 0) {
        const places: NearbyPlaceInput[] = googlePlaces.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          category: placeCategory(p.types),
          photoUrl: p.photoUrl,
        }))
        const offers = await attachCatalogAndFilter(lat, lng, mode, places)
        return NextResponse.json(offers, { status: 200 })
      }
    }

    const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY
    let features: GeoFeature[] = []

    if (GEOAPIFY_API_KEY) {
      try {
        features = await fetchGeoapifyPlaces(
          GEOAPIFY_API_KEY,
          lat,
          lng,
          radiusMeters,
          mode === 'top' ? 40 : 25
        )
      } catch (e) {
        console.error('Geoapify fetch failed:', e)
      }
    }

    if (features.length === 0) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          'X-ESR-Nearby': googleKey ? 'empty' : 'missing-google-places-key',
        },
      })
    }

    const enrichLimit = isGooglePlacesAvailable() ? Math.min(features.length, 16) : 0
    const photos = await Promise.all(
      features.slice(0, enrichLimit).map(async (f) => {
        const props = f.properties || {}
        if (!props.name) return null
        return findGooglePhotoForName(props.name, props.lat || lat, props.lon || lng)
      })
    )

    const places: NearbyPlaceInput[] = features.map((place, index) => {
      const props = place.properties || {}
      const name = props.name || `Restaurant ${index + 1}`
      const address = props.formatted || 'Near you'
      const placeLat = props.lat || lat
      const placeLng = props.lon || lng
      const stableId =
        props.place_id ||
        `live-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Number(placeLat).toFixed(4)}-${Number(placeLng).toFixed(4)}`
      const categoryLabel =
        props.categories
          ?.find((c) => c.startsWith('catering.'))
          ?.replace('catering.', '')
          .replace(/_/g, ' ') || 'restaurant'

      return {
        id: stableId,
        name,
        address,
        lat: placeLat,
        lng: placeLng,
        category: categoryLabel,
        photoUrl: index < photos.length ? photos[index] : null,
      }
    })

    const offers = await attachCatalogAndFilter(lat, lng, mode, places)
    return NextResponse.json(offers, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
