'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type SavedOffer = {
  id: string
  offer_id: string
  offers: {
    id: string
    name: string
    discounted_price: number
    original_price: number
    image_url: string | null
    restaurant_id: string
    restaurants: {
      name: string
      cover_url: string | null
      categories: { name: string } | null
    } | null
  } | null
}

type SavedRestaurant = {
  id: string
  restaurant_id: string
  restaurants: {
    id: string
    name: string
    city: string | null
    cover_url: string | null
  } | null
}

interface Props {
  initialItems: SavedOffer[]
  initialRestaurants: SavedRestaurant[]
  userId: string
}

export default function FavouritesClient({ initialItems, initialRestaurants, userId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [restaurants, setRestaurants] = useState(initialRestaurants)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function removeOffer(offerId: string) {
    setBusyId(offerId)
    setError('')
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('user_offers')
        .delete()
        .eq('user_id', userId)
        .eq('offer_id', offerId)
      if (deleteError) throw deleteError
      setItems((current) => current.filter((item) => item.offer_id !== offerId))
      toast.success('Removed from saved offers')
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Could not remove this offer.'
      setError(message)
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  async function removeRestaurant(restaurantId: string) {
    setBusyId(restaurantId)
    setError('')
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('user_restaurants')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
      if (deleteError) throw deleteError
      setRestaurants((current) => current.filter((item) => item.restaurant_id !== restaurantId))
      toast.success('Removed from saved restaurants')
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Could not remove this restaurant.'
      setError(message)
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  const isEmpty = items.length === 0 && restaurants.length === 0

  return (
    <div className="space-y-8">
      <header>
        <p className="esr-eyebrow">Your saved places</p>
        <h1 className="esr-serif mt-2 text-3xl text-[var(--plum)]">Favourites</h1>
      </header>
      {error && <p role="alert" className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--plum)]">Error: {error}</p>}
      {isEmpty ? (
        <div className="esr-card py-16 text-center">
          <h2 className="esr-serif text-2xl text-[var(--plum)]">No saved places yet</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Save a restaurant or offer to find it here.</p>
          <Link href="/user/offers" className="esr-primary-button mt-5 inline-flex min-h-11 items-center px-6">Explore restaurants</Link>
        </div>
      ) : (
        <>
          {restaurants.length > 0 && (
            <section aria-labelledby="saved-restaurants-heading">
              <h2 id="saved-restaurants-heading" className="esr-serif mb-4 text-2xl text-[var(--plum)]">Saved restaurants</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restaurants.map((item) => {
                  const restaurant = item.restaurants
                  if (!restaurant) return null
                  return (
                    <li key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                      <Link href={`/user/offers#restaurant/${encodeURIComponent(restaurant.id)}`} className="block">
                        <div className="relative aspect-[11/6] bg-[var(--surface-muted)]">
                          {restaurant.cover_url && <Image src={restaurant.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}
                        </div>
                        <div className="p-4">
                          <h3 className="esr-serif text-xl text-[var(--plum)]">{restaurant.name}</h3>
                          <p className="mt-1 text-sm text-[var(--muted)]">{restaurant.city || 'Pakistan'}</p>
                        </div>
                      </Link>
                      <div className="px-4 pb-4">
                        <button type="button" disabled={busyId === restaurant.id} onClick={() => void removeRestaurant(restaurant.id)} className="esr-outline-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm text-[var(--crimson)] disabled:opacity-60">
                          <Trash2 aria-hidden="true" size={16} /> Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {items.length > 0 && (
            <section aria-labelledby="saved-offers-heading">
              <h2 id="saved-offers-heading" className="esr-serif mb-4 text-2xl text-[var(--plum)]">Saved offers</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const offer = item.offers
                  if (!offer) return null
                  const percent = offer.original_price > 0
                    ? Math.ceil(100 - (offer.discounted_price / offer.original_price) * 100)
                    : 0
                  return (
                    <li key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                      <Link href={`/user/offers/${offer.id}`} className="block">
                        <div className="relative aspect-[11/6] bg-[var(--surface-muted)]">
                          {(offer.image_url || offer.restaurants?.cover_url) && (
                            <Image src={offer.image_url || offer.restaurants?.cover_url || ''} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                          )}
                          {percent > 0 && <span className="absolute right-3 top-3 rounded-full bg-[var(--crimson)] px-3 py-1 text-sm font-semibold text-white">{percent}% OFF</span>}
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-[var(--muted)]">{offer.restaurants?.name || 'Restaurant'} · {offer.restaurants?.categories?.name || 'Dining'}</p>
                          <h3 className="esr-serif mt-1 text-xl text-[var(--plum)]">{offer.name}</h3>
                          <p className="mt-2 font-semibold text-[var(--crimson)]">PKR {offer.discounted_price.toLocaleString('en-PK')}</p>
                        </div>
                      </Link>
                      <div className="px-4 pb-4">
                        <button type="button" disabled={busyId === offer.id} onClick={() => void removeOffer(offer.id)} className="esr-outline-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm text-[var(--crimson)] disabled:opacity-60">
                          <Trash2 aria-hidden="true" size={16} /> Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
