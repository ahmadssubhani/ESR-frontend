import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, coupon_offer } = await request.json()
  if (!code || !coupon_offer) {
    return NextResponse.json({ error: 'code and coupon_offer are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('apply_coupon', {
    p_user_id: user.id,
    p_coupon_code: code,
    p_offer_id: coupon_offer,
  })

  if (error) return NextResponse.json({ error: error.message, coupon_applied: false }, { status: 500 })

  const result = data as { success: boolean; message?: string; error?: string }
  if (!result.success) {
    return NextResponse.json({ message: result.error, coupon_applied: false }, { status: 422 })
  }

  return NextResponse.json({ message: result.message, coupon_applied: true })
}
