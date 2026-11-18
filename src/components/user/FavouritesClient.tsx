'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import {
  isDbOfferId,
  readSavedOfferIds,
  readSavedOfferSnapshots,
  removeSavedOfferSnapshot,
  writeSavedOfferIds,
  type SavedOfferSnapshot,
} from '@/lib/saved-offers'
import { toast } from 'sonner'
import { InlineLoader } from '@/components/ui/loader'

interface WishlistItem {
  id: string
  offer_id: string
  offers: {
    id: string; name: string; discounted_price: number; original_price: number
    image_url: string | null
    restaurants: { name: string; cover_url: string | null; categories: { name: string } | null } | null
  } | null
}

function mergeItems(dbItems: WishlistItem[], localItems: SavedOfferSnapshot[]): WishlistItem[] {
  const byOfferId = new Map<string, WishlistItem>()
  for (const item of localItems) {
    byOfferId.set(item.offer_id, item)
  }
  for (const item of dbItems) {
    if (item.offers) byOfferId.set(item.offer_id, item)
  }
  return Array.from(byOfferId.values())
}

export default function FavouritesClient({ initialItems, demoMode = false }: { initialItems: WishlistItem[]; demoMode?: boolean }) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(mergeItems(initialItems, readSavedOfferSnapshots()))
    setReady(true)
  }, [initialItems])

  async function remove(offerId: string) {
    if (!demoMode && isDbOfferId(offerId)) {
      await fetch(`/api/wishlist/${offerId}`, { method: 'DELETE' })
    }

    removeSavedOfferSnapshot(offerId)
    const nextIds = readSavedOfferIds().filter((id) => id !== offerId)
    writeSavedOfferIds(nextIds)
    setItems((prev) => prev.filter((item) => item.offer_id !== offerId))
    toast.success('Removed from saved')
  }

  if (!ready) {
    return <InlineLoader label="Loading saved offers…" />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">❤️</div>
        <h2 className="font-bold text-gray-900 mb-2">No saved offers yet</h2>
        <p className="text-sm mb-6">Tap the heart icon on any offer to save it here.</p>
        <Link href="/user/offers" className="bg-red-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">
          Browse Offers
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-6">❤️ Saved Offers ({items.length})</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const offer = item.offers
          if (!offer) return null
          const discountPct = offer.original_price > 0
            ? Math.ceil(100 - (offer.discounted_price / offer.original_price) * 100) : 0
          const isLocalOnly = !isDbOfferId(offer.id)
          const card = (
            <>
              <div className="relative h-36 bg-gray-100">
                {offer.image_url || offer.restaurants?.cover_url ? (
                  <img src={offer.image_url || offer.restaurants?.cover_url || ''} alt={offer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                {discountPct > 0 && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-black px-2 py-1 rounded-lg">{discountPct}% OFF</div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-1">{offer.restaurants?.name} · {offer.restaurants?.categories?.name}</p>
                <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{offer.name}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[rgb(220, 38, 38)] font-black">Rs {offer.discounted_price}</span>
                    {offer.original_price > 0 && <span className="text-gray-400 text-xs line-through ml-2">Rs {offer.original_price}</span>}
                  </div>
                </div>
              </div>
            </>
          )
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
              {isLocalOnly ? (
                <div>{card}</div>
              ) : (
                <Link href={`/user/offers/${offer.id}`}>{card}</Link>
              )}
              <div className="px-4 pb-4">
                <button onClick={() => remove(offer.id)}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 text-sm py-2 rounded-xl hover:bg-red-50 transition-colors">
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
