/** UUID offer IDs can persist in user_offers; nearby/live IDs cannot. */
export const isDbOfferId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

export type SavedOfferSnapshot = {
  id: string
  offer_id: string
  offers: {
    id: string
    name: string
    discounted_price: number
    original_price: number
    image_url: string | null
    restaurants: {
      name: string
      cover_url: string | null
      categories: { name: string } | null
    } | null
  }
}

const IDS_KEY = 'esr_saved_offers'
const DATA_KEY = 'esr_saved_offers_data'

export function readSavedOfferIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeSavedOfferIds(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(IDS_KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event('esr-saved-updated'))
}

export function readSavedOfferSnapshots(): SavedOfferSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeSavedOfferSnapshots(items: SavedOfferSnapshot[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DATA_KEY, JSON.stringify(items))
}

export function upsertSavedOfferSnapshot(offer: {
  id: string
  name: string
  discounted_price: number
  original_price: number
  image_url?: string | null
  restaurants?: {
    name?: string
    cover_url?: string | null
    categories?: { name: string } | null
  } | null
}) {
  const snapshots = readSavedOfferSnapshots().filter((s) => s.offer_id !== offer.id)
  snapshots.unshift({
    id: `local-${offer.id}`,
    offer_id: offer.id,
    offers: {
      id: offer.id,
      name: offer.name,
      discounted_price: offer.discounted_price,
      original_price: offer.original_price,
      image_url: offer.image_url ?? null,
      restaurants: offer.restaurants
        ? {
            name: offer.restaurants.name || 'Restaurant',
            cover_url: offer.restaurants.cover_url ?? null,
            categories: offer.restaurants.categories ?? null,
          }
        : null,
    },
  })
  writeSavedOfferSnapshots(snapshots)
}

export function removeSavedOfferSnapshot(offerId: string) {
  writeSavedOfferSnapshots(readSavedOfferSnapshots().filter((s) => s.offer_id !== offerId))
}
