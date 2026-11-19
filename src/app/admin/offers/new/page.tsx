import { createClient } from '@/lib/supabase/server'
import OfferForm from '@/components/admin/OfferForm'

export default async function NewOfferPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = supabase.from('restaurants').select('id, name')
  if (profile?.role === 'restaurant') query = query.eq('owner_id', user!.id)
  const { data: restaurants } = await query.order('name')

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">New Offer</h1>
      <OfferForm offer={null} restaurants={restaurants || []} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
