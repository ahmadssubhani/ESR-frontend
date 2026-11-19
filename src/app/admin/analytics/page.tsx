import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from '@/components/admin/AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = profileData as { role: string } | null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let redemptionsQuery = supabase.from('user_coupons').select('used_at, offer_id, offers(name, restaurants(name))').gte('used_at', thirtyDaysAgo)
  if (profile?.role === 'owner') {
    const { data: r } = await supabase.from('restaurants').select('id').eq('owner_id', user!.id).single()
    const restaurant = r as { id: string } | null
    if (restaurant) redemptionsQuery = redemptionsQuery.eq('offers.restaurant_id', restaurant.id)
  }

  type RedemptionRow = { used_at: string; offer_id: string; offers: { name: string; restaurants: { name: string } | null } | null }
  type RestaurantRow = { id: string; name: string; reviews: { rating_overall: number }[] }
  type ReviewRow = { rating_overall: number; created_at: string }

  const [{ data: rawRedemptions }, { data: rawRestaurants }, { data: rawReviews }] = await Promise.all([
    redemptionsQuery.order('used_at'),
    supabase.from('restaurants').select('id, name, reviews(rating_overall)').eq('is_active', true).limit(20),
    supabase.from('reviews').select('rating_overall, created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
  ])

  const redemptions = rawRedemptions as RedemptionRow[] | null
  const topRestaurants = rawRestaurants as RestaurantRow[] | null
  const recentReviews = rawReviews as ReviewRow[] | null

  // Redemptions by day
  const byDay: Record<string, number> = {}
  for (const r of redemptions || []) {
    const day = r.used_at.split('T')[0]
    byDay[day] = (byDay[day] || 0) + 1
  }
  const redemptionChart = Object.entries(byDay).map(([date, count]) => ({ date: date.slice(5), count }))

  // Top offers by redemption
  const offerCounts: Record<string, { name: string; restaurant: string; count: number }> = {}
  for (const r of redemptions || []) {
    const id = r.offer_id
    const name = r.offers?.name || id
    const restaurant = r.offers?.restaurants?.name || ''
    if (!offerCounts[id]) offerCounts[id] = { name, restaurant, count: 0 }
    offerCounts[id].count++
  }
  const topOffers = Object.values(offerCounts).sort((a, b) => b.count - a.count).slice(0, 10)

  // Top restaurants by avg rating
  const ratingData = (topRestaurants || [])
    .map(r => {
      const ratings = (r.reviews || [])
        .map((rv) => rv.rating_overall)
        .filter((n): n is number => n != null)
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
      return { name: r.name, avg_rating: parseFloat(avg.toFixed(1)), reviews_count: ratings.length }
    })
    .filter(r => r.reviews_count > 0)
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 10)

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Analytics</h1>
      <AnalyticsClient
        redemptionChart={redemptionChart}
        topOffers={topOffers}
        topRestaurants={ratingData}
        totalRedemptions={redemptions?.length || 0}
        totalReviews={recentReviews?.length || 0}
      />
    </div>
  )
}
