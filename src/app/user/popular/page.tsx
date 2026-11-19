import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Star, MapPin } from 'lucide-react'
import { DEMO_RESTAURANTS } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

export default async function PopularPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    return (
      <section>
        <p className="esr-eyebrow">Loved by local foodies</p>
        <h1 className="mb-6 mt-2 text-3xl font-bold text-[var(--plum)]">Top rated restaurants</h1>
        <div className="space-y-3">
          {DEMO_RESTAURANTS.slice(0, 4).map((restaurant, index) => (
            <Link
              key={restaurant.id}
              href={`/user/offers?city=${encodeURIComponent(restaurant.city || '')}`}
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="w-8 shrink-0 text-2xl font-bold text-[var(--muted)]">#{index + 1}</span>
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                {restaurant.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.image} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[var(--plum)]">{restaurant.name}</span>
                <span className="flex items-center gap-1 text-sm text-[var(--muted)]">
                  <MapPin aria-hidden="true" size={14} /> {restaurant.city}
                </span>
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-bold text-[var(--crimson)]">
                <Star aria-hidden="true" size={15} fill="currentColor" /> {(4.9 - index * 0.1).toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  const supabase = await createClient()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select(`*, categories(name), reviews(rating_overall)`)
    .eq('is_active', true)

  const sorted: Array<Record<string, any>> = ((restaurants || []) as Array<Record<string, any>>)
    .map(r => {
      const ratings = (r.reviews || [])
        .map((rv: { rating_overall: number | null }) => rv.rating_overall)
        .filter((n: number | null): n is number => n != null)
      const avg = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : null
      return { ...r, avg_rating: avg, reviews_count: ratings.length }
    })
    .filter(r => r.reviews_count > 0)
    .sort((a, b) => parseFloat(b.avg_rating || '0') - parseFloat(a.avg_rating || '0'))

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-6">⭐ Top Rated Restaurants</h1>
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🌟</div>
          <p>No rated restaurants yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, idx) => (
            <Link key={r.id} href={`/user/offers?restaurant=${r.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl font-black text-gray-200 w-8">#{idx + 1}</div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {r.logo_url ? (
                  <img src={r.logo_url} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{r.name}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {r.city} · {(r.categories as { name: string })?.name}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg flex-shrink-0">
                <Star size={13} className="text-red-600 fill-current" />
                <span className="text-sm font-black text-red-600">{r.avg_rating}</span>
                <span className="text-xs text-gray-400">({r.reviews_count})</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
