import { NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'restaurant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalRestaurants },
    { count: activeOffers },
    { count: todayRedemptions },
    { count: todayReviews },
    { data: redemptionsByDay },
    { data: topOffers },
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('approval_status', true),
    supabase.from('user_coupons').select('*', { count: 'exact', head: true }).gte('used_at', today),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('user_coupons').select('used_at').gte('used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('user_coupons').select('offer_id, offers(name)').limit(100),
  ])

  // Group redemptions by day for chart
  const byDay: Record<string, number> = {}
  for (const r of redemptionsByDay || []) {
    const day = r.used_at.split('T')[0]
    byDay[day] = (byDay[day] || 0) + 1
  }

  // Count top offers
  const offerCounts: Record<string, { name: string; count: number }> = {}
  for (const r of topOffers || []) {
    const id = r.offer_id
    const name = (r.offers as unknown as { name: string })?.name || id
    if (!offerCounts[id]) offerCounts[id] = { name, count: 0 }
    offerCounts[id].count++
  }

  return NextResponse.json({
    kpis: {
      total_restaurants: totalRestaurants,
      active_offers: activeOffers,
      today_redemptions: todayRedemptions,
      today_reviews: todayReviews,
    },
    redemptions_by_day: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    top_offers: Object.entries(offerCounts).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count).slice(0, 10),
  })
}
