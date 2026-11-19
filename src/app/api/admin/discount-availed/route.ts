import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'restaurant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  // Get restaurant owned by user (for owners)
  let restaurantId: string | null = null
  if (profile.role === 'restaurant') {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    if (!restaurant) return NextResponse.json([])
    restaurantId = restaurant.id
  }

  let query = supabase
    .from('offers')
    .select(`id, name, valid_from, valid_till, original_price, discounted_price, coupons(id, code), user_coupons(id, used_at)`)

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (startDate) query = query.gte('valid_from', startDate)
  if (endDate) query = query.lte('valid_till', endDate)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data.map(offer => ({
    id: offer.id,
    name: offer.name,
    valid_from: offer.valid_from,
    valid_till: offer.valid_till,
    original_price: offer.original_price,
    discounted_price: offer.discounted_price,
    coupon_code: offer.coupons?.[0]?.code || '_',
    availed: offer.user_coupons?.length || 0,
  }))

  return NextResponse.json(result)
}
