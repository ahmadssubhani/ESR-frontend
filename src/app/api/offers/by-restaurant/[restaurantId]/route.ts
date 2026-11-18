import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('offers')
    .select(`*, restaurants(id, name, cover_url, logo_url, categories(name)), reviews(rating_overall), user_coupons(id)`)
    .eq('restaurant_id', restaurantId)
    .eq('approval_status', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
