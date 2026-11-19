import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import CouponsClient from '@/components/admin/CouponsClient'

export default async function CouponsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = supabase.from('coupons').select(`*, offers(id, name, restaurants(name)), user_coupons(id)`)
  if (profile?.role === 'restaurant') {
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_id', user!.id).single()
    const restaurant = r as { id: string } | null
    if (restaurant) query = query.eq('offers.restaurant_id', restaurant.id)
  }
  const { data: coupons } = await query.order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Coupons</h1>
      <CouponsClient coupons={(coupons || []) as Record<string, unknown>[]} />
    </div>
  )
}
