import { createClient } from '@/lib/supabase/server'
import ReviewsAdmin from '@/components/admin/ReviewsAdmin'
import LiveRefresh from '@/components/admin/LiveRefresh'

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  let query = supabase.from('reviews').select(`*, profiles(full_name), restaurants(name), offers(name), review_images(image_url)`)
  if (profile?.role === 'restaurant') {
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_id', user!.id).single()
    const restaurant = r as { id: string } | null
    if (restaurant) query = query.eq('restaurant_id', restaurant.id)
  }
  const { data: reviews } = await query.order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Reviews</h1>
      <LiveRefresh />
      <ReviewsAdmin reviews={(reviews || []) as Record<string, unknown>[]} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
