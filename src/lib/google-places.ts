/**
 * Google Places helpers — real venue photos for nearby restaurants.
 * Requires GOOGLE_PLACES_API_KEY with Places API (New) + billing enabled.
 */

export function getGooglePlacesKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  )
}

export type GooglePlaceResult = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
  types: string[]
  /** App-relative photo URL (proxied — does not expose API key) */
  photoUrl: string | null
  photoRef: string | null
}

type LegacyNearbyResult = {
  place_id?: string
  name?: string
  vicinity?: string
  formatted_address?: string
  geometry?: { location?: { lat: number; lng: number } }
  rating?: number
  types?: string[]
  photos?: { photo_reference: string }[]
}

type NewNearbyPlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  types?: string[]
  photos?: { name?: string }[]
}

/** Skip further Google calls in this process after a hard deny (403 / REQUEST_DENIED). */
let googlePlacesDisabledReason: string | null = null

export function isGooglePlacesAvailable(): boolean {
  return Boolean(getGooglePlacesKey()) && !googlePlacesDisabledReason
}

function markGooglePlacesDisabled(reason: string) {
  if (!googlePlacesDisabledReason) {
    googlePlacesDisabledReason = reason
    console.warn(
      `[Google Places] Disabled for this process: ${reason}. ` +
        'Enable Places API (New) + billing on project 110373980781, then restart the dev server. ' +
        'Falling back to Geoapify without Google photos.'
    )
  }
}

function categoryFromTypes(types: string[] = []): string {
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'cafe'
  if (types.includes('bakery')) return 'bakery'
  if (types.includes('meal_takeaway') || types.includes('meal_delivery')) return 'fast food'
  return 'restaurant'
}

export function placeCategory(types: string[] = []): string {
  return categoryFromTypes(types)
}

/** Build proxied photo URL so the Google API key never reaches the browser */
export function proxiedPhotoUrl(ref: string, kind: 'legacy' | 'new' = 'legacy'): string {
  const params = new URLSearchParams({ ref, kind })
  return `/api/restaurants/photo?${params.toString()}`
}

async function searchNearbyNew(
  key: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  maxResults: number
): Promise<GooglePlaceResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos',
    },
    body: JSON.stringify({
      includedTypes: ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
      maxResultCount: Math.min(maxResults, 20),
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 403 || body.includes('PERMISSION_DENIED') || body.includes('API_KEY_SERVICE_BLOCKED')) {
      markGooglePlacesDisabled(`Places API (New) 403 — enable it in Google Cloud`)
    }
    return []
  }

  const data = (await res.json()) as { places?: NewNearbyPlace[] }
  return (data.places || [])
    .map((p) => {
      const photoName = p.photos?.[0]?.name || null
      return {
        id: p.id || `google-${p.displayName?.text || 'place'}`,
        name: p.displayName?.text || 'Restaurant',
        address: p.formattedAddress || 'Nearby',
        lat: p.location?.latitude ?? lat,
        lng: p.location?.longitude ?? lng,
        rating: typeof p.rating === 'number' ? p.rating : null,
        types: p.types || [],
        photoRef: photoName,
        photoUrl: photoName ? proxiedPhotoUrl(photoName, 'new') : null,
      } satisfies GooglePlaceResult
    })
    .filter((p) => p.name)
}

async function searchNearbyLegacy(
  key: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlaceResult[]> {
  const types = ['restaurant', 'cafe']
  const all: LegacyNearbyResult[] = []

  for (const type of types) {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=${Math.round(radiusMeters)}` +
      `&type=${type}` +
      `&key=${key}`

    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as {
      results?: LegacyNearbyResult[]
      status?: string
      error_message?: string
    }
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      if (data.status === 'REQUEST_DENIED') {
        markGooglePlacesDisabled(
          data.error_message || 'Places (legacy) REQUEST_DENIED — enable billing + Places API'
        )
        return []
      }
      continue
    }
    all.push(...(data.results || []))
  }

  const seen = new Set<string>()
  const unique: LegacyNearbyResult[] = []
  for (const r of all) {
    const id = r.place_id || r.name || ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(r)
  }

  return unique.map((r) => {
    const photoRef = r.photos?.[0]?.photo_reference || null
    return {
      id: r.place_id || `google-${r.name}`,
      name: r.name || 'Restaurant',
      address: r.vicinity || r.formatted_address || 'Nearby',
      lat: r.geometry?.location?.lat ?? lat,
      lng: r.geometry?.location?.lng ?? lng,
      rating: typeof r.rating === 'number' ? r.rating : null,
      types: r.types || [],
      photoRef,
      photoUrl: photoRef ? proxiedPhotoUrl(photoRef, 'legacy') : null,
    }
  })
}

/**
 * Find nearby restaurants with real Google photos.
 * Tries Places API (New) first, then legacy Nearby Search.
 */
export async function fetchGoogleNearbyRestaurants(
  lat: number,
  lng: number,
  options?: { radiusMeters?: number; limit?: number; mode?: string }
): Promise<GooglePlaceResult[]> {
  const key = getGooglePlacesKey()
  if (!key || googlePlacesDisabledReason) return []

  const radiusMeters = options?.radiusMeters ?? (options?.mode === 'top' ? 15000 : 5000)
  const limit = options?.limit ?? 24

  const placesNew = await searchNearbyNew(key, lat, lng, radiusMeters, limit)
  if (placesNew.length > 0) return placesNew.slice(0, limit)
  if (googlePlacesDisabledReason) return []

  const placesLegacy = await searchNearbyLegacy(key, lat, lng, radiusMeters)
  return placesLegacy.slice(0, limit)
}

/**
 * Match a venue name near lat/lng to a Google photo (for Geoapify fallback enrichment).
 */
export async function findGooglePhotoForName(
  name: string,
  lat: number,
  lng: number
): Promise<string | null> {
  const key = getGooglePlacesKey()
  if (!key || !name || googlePlacesDisabledReason) return null

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify({
        textQuery: name,
        maxResultCount: 1,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 2000,
          },
        },
      }),
    })

    if (res.status === 403) {
      markGooglePlacesDisabled('Places API (New) text search 403')
      return null
    }

    if (res.ok) {
      const data = (await res.json()) as { places?: NewNearbyPlace[] }
      const photoName = data.places?.[0]?.photos?.[0]?.name
      if (photoName) return proxiedPhotoUrl(photoName, 'new')
    }
  } catch {
    // fall through to legacy
  }

  if (googlePlacesDisabledReason) return null

  try {
    const findUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(name)}` +
      `&inputtype=textquery` +
      `&locationbias=point:${lat},${lng}` +
      `&fields=photos,place_id,name` +
      `&key=${key}`

    const findRes = await fetch(findUrl)
    if (!findRes.ok) return null
    const findData = await findRes.json()
    if (findData?.status === 'REQUEST_DENIED') {
      markGooglePlacesDisabled(findData?.error_message || 'Places (legacy) REQUEST_DENIED')
      return null
    }
    const photoRef = findData?.candidates?.[0]?.photos?.[0]?.photo_reference
    if (!photoRef) return null
    return proxiedPhotoUrl(photoRef, 'legacy')
  } catch {
    return null
  }
}
