import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PopularPage() {
  const supabase = await createClient()
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, city, cover_url, reviews(rating_overall)')
    .eq('is_active', true)

  if (error) throw new Error(`Could not load restaurant ratings: ${error.message}`)
  const sorted = (restaurants || [])
    .map((restaurant) => {
      const ratings = restaurant.reviews
        .map((review) => review.rating_overall)
        .filter((rating): rating is number => rating !== null)
      const average = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null
      return { ...restaurant, average, reviewCount: ratings.length }
    })
    .filter((restaurant) => restaurant.average !== null)
    .sort((a, b) => (b.average || 0) - (a.average || 0))

  return (
    <section>
      <p className="esr-eyebrow">Loved by local foodies</p>
      <h1 className="esr-serif mb-6 mt-2 text-3xl text-[var(--plum)]">Top rated restaurants</h1>
      {sorted.length === 0 ? (
        <div className="esr-card py-20 text-center">
          <p className="text-base text-[var(--plum)]">No rated restaurants yet.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {sorted.map((restaurant, index) => (
            <li key={restaurant.id}>
              <Link
                href={`/user/offers#restaurant/${encodeURIComponent(restaurant.id)}`}
                className="flex min-h-20 items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 transition-shadow hover:shadow-md"
              >
                <span aria-hidden="true" className="w-8 shrink-0 text-2xl font-bold text-[var(--muted)]">#{index + 1}</span>
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                  {restaurant.cover_url && <Image src={restaurant.cover_url} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-[var(--plum)]">{restaurant.name}</span>
                  <span className="flex items-center gap-1 text-sm text-[var(--muted)]">
                    <MapPin aria-hidden="true" size={14} /> {restaurant.city || 'Pakistan'}
                  </span>
                </span>
                <span aria-label={`Rated ${restaurant.average?.toFixed(1)} out of 5 from ${restaurant.reviewCount} reviews`} className="flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-1 font-bold text-[var(--plum)]">
                  <Star aria-hidden="true" size={15} fill="currentColor" /> {restaurant.average?.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
