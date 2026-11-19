import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OfferForm from '@/components/admin/OfferForm'

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  const [{ data: offer }, restaurantsResult] = await Promise.all([
    supabase.from('offers').select('*').eq('id', id).single(),
    profile?.role === 'restaurant'
      ? supabase.from('restaurants').select('id, name').eq('owner_id', user!.id).order('name')
      : supabase.from('restaurants').select('id, name').order('name'),
  ])

  if (!offer) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Edit Offer</h1>
      <OfferForm offer={offer} restaurants={restaurantsResult.data || []} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
