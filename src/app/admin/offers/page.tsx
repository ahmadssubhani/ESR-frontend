import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

export default async function AdminOffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = supabase.from('offers').select(`*, restaurants(id, name), user_coupons(id)`)
  if (profile?.role === 'restaurant') {
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_id', user!.id).single()
    const restaurant = r as { id: string } | null
    if (restaurant) query = query.eq('restaurant_id', restaurant.id)
  }
  const { data: offers } = await query.order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Offers</h1>
        <Link href="/admin/offers/new" className="flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
          <Plus size={16} /> New Offer
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Offer', 'Restaurant', 'Price', 'Valid Till', 'Status', 'Redeemed', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(offers || []).map(offer => (
                <tr key={offer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-gray-900 max-w-[180px] truncate">{offer.name}</p>
                    <p className="text-xs text-gray-400">{offer.is_bumper ? '🎉 Bumper' : offer.is_redeemable ? '✓ Redeemable' : '✗ Not redeemable'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(offer.restaurants as { name: string })?.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-red-600 font-bold text-sm">Rs {offer.discounted_price}</span>
                    {offer.original_price > 0 && <span className="text-xs text-gray-400 line-through ml-1">Rs {offer.original_price}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{offer.valid_till ? format(new Date(offer.valid_till), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-3">
                    {offer.approval_status
                      ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={13} /> Approved</span>
                      : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={13} /> Pending</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">{(offer.user_coupons as unknown[])?.length || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/offers/${offer.id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
                      <Pencil size={13} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(offers || []).length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No offers yet.</div>}
        </div>
      </div>
    </div>
  )
}
