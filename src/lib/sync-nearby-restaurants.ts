import { createServiceClient } from '@/lib/supabase/server'
import {
  ADMIN_SYNC_RADIUS_M,
  LIVE_NEARBY_TAG,
  MATCH_RADIUS_M,
  boundingBox,
  distanceMeters,
  normalizeRestaurantName,
  placeIdTag,
} from '@/lib/geo'

export type NearbyPlaceInput = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category?: string
  photoUrl?: string | null
}

export type CatalogRestaurant = {
  id: string
  name: string
  lat: number | null
  lng: number | null
  cover_url: string | null
  logo_url: string | null
  tags: string[] | null
  google_place_id?: string | null
  categories: { name: string } | null
}

type CatalogOffer = {
  id: string
  name: string
  description: string | null
  original_price: number
  discounted_price: number
  image_url: string | null
  restaurant_id: string
}

export type SyncedNearbyPlace = NearbyPlaceInput & {
  restaurant: CatalogRestaurant | null
  offer: CatalogOffer | null
  created: boolean
}

function hasPlaceTag(tags: string[] | null | undefined, placeId: string) {
  return (tags || []).includes(placeIdTag(placeId))
}

function cityFromAddress(address: string) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || 'Nearby'
}

async function ensureCategoryId(name: string): Promise<string | null> {
  const supabase = createServiceClient()
  const label = name.trim() || 'restaurant'
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', label)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created } = await supabase
    .from('categories')
    .insert({ name: label })
    .select('id')
    .maybeSingle()
  return created?.id || null
}

function matchExisting(
  place: NearbyPlaceInput,
  restaurants: CatalogRestaurant[]
): CatalogRestaurant | undefined {
  const tagged = restaurants.find((row) => hasPlaceTag(row.tags, place.id) || row.google_place_id === place.id)
  if (tagged) return tagged

  const target = normalizeRestaurantName(place.name)
  return restaurants.find((row) => {
    if (!row.lat || !row.lng) return false
    if (normalizeRestaurantName(row.name) !== target) return false
    return distanceMeters(place.lat, place.lng, row.lat, row.lng) <= MATCH_RADIUS_M
  })
}

async function insertRestaurant(place: NearbyPlaceInput): Promise<CatalogRestaurant | null> {
  const supabase = createServiceClient()
  const categoryId = await ensureCategoryId(place.category || 'restaurant')
  const base = {
    name: place.name,
    description: 'Discovered from a live nearby search. Left unchanged if it already existed.',
    address: place.address,
    city: cityFromAddress(place.address),
    country: 'PK',
    lat: place.lat,
    lng: place.lng,
    cover_url: place.photoUrl || null,
    image_url: place.photoUrl || null,
    is_active: true,
    is_featured: false,
    tags: [LIVE_NEARBY_TAG, placeIdTag(place.id)],
    category_id: categoryId,
    restaurant_type: 'DINE IN & TAKE AWAY & DELIVERY',
    price_level: 'MEDIUM' as const,
  }

  const withPlaceId = { ...base, google_place_id: place.id, source: 'live' }
  let inserted = await supabase.from('restaurants').insert(withPlaceId).select('id, name, lat, lng, cover_url, logo_url, tags').maybeSingle()
  if (inserted.error) {
    inserted = await supabase.from('restaurants').insert(base).select('id, name, lat, lng, cover_url, logo_url, tags').maybeSingle()
  }
  if (inserted.error || !inserted.data) {
    console.error('Nearby restaurant insert skipped:', inserted.error?.message)
    return null
  }

  return {
    ...inserted.data,
    categories: { name: place.category || 'restaurant' },
  }
}

async function loadCatalogOffers(restaurantIds: string[]): Promise<CatalogOffer[]> {
  if (restaurantIds.length === 0) return []
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('offers')
    .select('id, name, description, original_price, discounted_price, image_url, restaurant_id')
    .in('restaurant_id', restaurantIds)
    .eq('approval_status', true)
    .eq('is_redeemable', true)
    .eq('is_bumper', false)
    .lte('valid_from', now)
    .gte('valid_till', now)
  return (data || []) as CatalogOffer[]
}

/**
 * Upsert live places into the restaurants table for admin.
 * Existing rows are left as-is. Only places within 500m are persisted.
 */
export async function syncNearbyPlacesToCatalog(
  userLat: number,
  userLng: number,
  places: NearbyPlaceInput[]
): Promise<SyncedNearbyPlace[]> {
  const supabase = createServiceClient()
  const box = boundingBox(userLat, userLng, ADMIN_SYNC_RADIUS_M)
  const { data: existingRows } = await supabase
    .from('restaurants')
    .select('id, name, lat, lng, cover_url, logo_url, tags, categories(name)')
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLng)
    .lte('lng', box.maxLng)

  const existing = (existingRows || []) as CatalogRestaurant[]
  const synced: SyncedNearbyPlace[] = []

  for (const place of places) {
    const withinSync = distanceMeters(userLat, userLng, place.lat, place.lng) <= ADMIN_SYNC_RADIUS_M
    const matched = matchExisting(place, existing)
    if (matched) {
      synced.push({ ...place, restaurant: matched, offer: null, created: false })
      continue
    }
    if (!withinSync) {
      synced.push({ ...place, restaurant: null, offer: null, created: false })
      continue
    }
    const created = await insertRestaurant(place)
    if (created) existing.push(created)
    synced.push({ ...place, restaurant: created, offer: null, created: Boolean(created) })
  }

  const restaurantIds = synced.map((row) => row.restaurant?.id).filter((id): id is string => Boolean(id))
  const offers = await loadCatalogOffers(restaurantIds)
  const offerByRestaurant = new Map<string, CatalogOffer>()
  for (const offer of offers) {
    if (!offerByRestaurant.has(offer.restaurant_id)) offerByRestaurant.set(offer.restaurant_id, offer)
  }

  return synced.map((row) => ({
    ...row,
    offer: row.restaurant ? offerByRestaurant.get(row.restaurant.id) || null : null,
  }))
}
