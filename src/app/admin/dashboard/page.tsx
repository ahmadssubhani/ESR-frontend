import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import DashboardClient, { type Review } from '@/components/admin/DashboardClient'

type OfferWithRelations = {
  id: string
  name: string
  valid_from: string | null
  valid_till: string | null
  coupons: { code: string }[] | null
  user_coupons: { id: string; used_at: string | null }[] | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  const today = new Date().toISOString().split('T')[0]

  let restaurantId: string | null = null
  if (profile?.role === 'restaurant') {
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_id', user!.id).single()
    restaurantId = (r as { id: string } | null)?.id || null
  }

  let offerQuery = supabase.from('offers').select(`id, name, valid_from, valid_till, original_price, discounted_price, coupons(code), user_coupons(id, used_at)`)
  let reviewQuery = supabase.from('reviews').select(`*, profiles(full_name, image_url), offers(name), review_images(image_url)`)
  let tagQuery = supabase.from('restaurants').select('tags')

  if (restaurantId) {
    offerQuery = offerQuery.eq('restaurant_id', restaurantId)
    reviewQuery = reviewQuery.eq('restaurant_id', restaurantId)
    tagQuery = tagQuery.eq('id', restaurantId)
  }

  const [
    { count: totalRestaurants },
    { count: activeOffers },
    { count: todayRedemptions },
    { count: todayReviews },
    { data: offers },
    { data: reviews },
    { data: restaurants },
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('approval_status', true),
    supabase.from('user_coupons').select('*', { count: 'exact', head: true }).gte('used_at', today),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', today),
    offerQuery.order('created_at', { ascending: false }),
    reviewQuery.eq('is_active', true).order('created_at', { ascending: false }).limit(20),
    tagQuery,
  ])

  // Compute discount availed table data
  const discountData = ((offers || []) as OfferWithRelations[]).map(o => ({
    id: o.id,
    name: o.name,
    valid_from: o.valid_from ? format(new Date(o.valid_from), 'MMM d, yyyy') : '-',
    valid_till: o.valid_till ? format(new Date(o.valid_till), 'MMM d, yyyy') : '-',
    coupon_code: o.coupons?.[0]?.code || '_',
    availed: o.user_coupons?.length || 0,
  }))

  // Tags
  const tagCount: Record<string, number> = {}
  for (const r of (restaurants || []) as { tags: string[] | null }[]) {
    for (const tag of r.tags || []) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }
  }
  const tags = Object.entries(tagCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  return (
    <DashboardClient
      kpis={{ totalRestaurants: totalRestaurants || 0, activeOffers: activeOffers || 0, todayRedemptions: todayRedemptions || 0, todayReviews: todayReviews || 0 }}
      discountData={discountData}
      reviews={(reviews || []) as Review[]}
      tags={tags}
      isAdmin={profile?.role === 'admin'}
    />
  )
}
