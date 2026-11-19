import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Pencil, Star } from 'lucide-react'

export default async function RestaurantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = supabase.from('restaurants').select(`*, categories(name), reviews(rating_overall), offers(id)`)
  if (profile?.role === 'restaurant') {
    query = query.eq('owner_id', user!.id)
  }
  const { data: restaurants } = await query.order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Restaurants</h1>
        {profile?.role === 'admin' && (
          <Link href="/admin/restaurants/new" className="flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
            <Plus size={16} /> Add Restaurant
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Restaurant', 'Category', 'City', 'Type', 'Featured', 'Source', 'Offers', 'Rating', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(restaurants || []).map(r => {
                const ratings = (r.reviews || [])
                  .map((rv) => rv.rating_overall)
                  .filter((n): n is number => n != null)
                const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {r.logo_url ? <img src={r.logo_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{(r.categories as { name: string })?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.city}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{r.restaurant_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${r.is_featured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                        {r.is_featured ? '⭐ Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(r.source === 'live' || (Array.isArray(r.tags) && r.tags.includes('live-nearby'))) ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-sky-50 text-sky-700">Live nearby</span>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700">{(r.offers || []).length}</td>
                    <td className="px-4 py-3">
                      {avg ? (
                        <div className="flex items-center gap-1">
                          <Star size={13} className="text-red-600 fill-current" />
                          <span className="text-sm font-bold">{avg}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/restaurants/${r.id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
                        <Pencil size={13} /> Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(restaurants || []).length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No restaurants yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
