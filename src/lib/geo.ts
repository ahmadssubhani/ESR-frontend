/** Website nearby list radius. Admin catalog sync uses a slightly wider ring. */
export const WEBSITE_NEARBY_RADIUS_M = 250
export const ADMIN_SYNC_RADIUS_M = 500
export const TOP_RESTAURANTS_RADIUS_M = 15000
export const MATCH_RADIUS_M = 80

export const LIVE_NEARBY_TAG = 'live-nearby'

export function placeIdTag(placeId: string) {
  return `place:${placeId}`
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, a)))
}

export function boundingBox(lat: number, lng: number, radiusMeters: number) {
  const pad = radiusMeters * 1.2
  const dLat = pad / 111320
  const cos = Math.cos((lat * Math.PI) / 180)
  const dLng = pad / (111320 * Math.max(0.2, Math.abs(cos)))
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  }
}

export function normalizeRestaurantName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
