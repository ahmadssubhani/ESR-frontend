import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'
import { generateEsrVoucherCode } from '@/lib/esr-voucher-code'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await getApiUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to claim this voucher.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const offerId = body.offer_id as string | undefined
  if (!offerId) {
    return NextResponse.json({ error: 'offer_id is required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: offer, error: offerError } = await admin
    .from('offers')
    .select('id, name, approval_status, is_redeemable, is_bumper, valid_from, valid_till, restaurant_id')
    .eq('id', offerId)
    .maybeSingle()

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }
  if (!offer.approval_status || !offer.is_redeemable || offer.is_bumper) {
    return NextResponse.json({ error: 'This offer cannot be claimed.' }, { status: 422 })
  }

  const now = Date.now()
  if (offer.valid_from && new Date(offer.valid_from).getTime() > now) {
    return NextResponse.json({ error: 'This offer is not active yet.' }, { status: 422 })
  }
  if (offer.valid_till && new Date(offer.valid_till).getTime() < now) {
    return NextResponse.json({ error: 'This offer has expired.' }, { status: 422 })
  }

  let { data: coupons } = await admin
    .from('coupons')
    .select('id, code, active')
    .eq('offer_id', offerId)
    .eq('active', true)
    .limit(1)

  if (!coupons?.length) {
    const { data: created, error: couponError } = await admin
      .from('coupons')
      .insert({
        offer_id: offerId,
        code: '',
        active: true,
        valid_from: offer.valid_from,
        valid_till: offer.valid_till,
      })
      .select('id, code, active')
      .single()
    if (couponError || !created) {
      return NextResponse.json({ error: couponError?.message || 'Could not create a voucher code.' }, { status: 400 })
    }
    coupons = [created]
  }

  const coupon = coupons[0]
  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await admin
    .from('user_coupons')
    .select('id, used_at, coupon_id')
    .eq('user_id', user.id)
    .eq('offer_id', offerId)
    .gte('used_at', ago24h)
    .order('used_at', { ascending: false })
    .limit(1)

  if (existing?.length) {
    return NextResponse.json({
      claimed: true,
      already_claimed: true,
      voucher_code: generateEsrVoucherCode(offerId),
      claimed_at: existing[0].used_at,
      message: 'You already claimed this voucher today. Show this code at checkout.',
    })
  }

  const { count: todayCount } = await admin
    .from('user_coupons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('used_at', ago24h)

  if ((todayCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Daily claim limit of 5 reached. Try again after 24 hours.' },
      { status: 422 }
    )
  }

  const { data: redemption, error: insertError } = await admin
    .from('user_coupons')
    .insert({
      user_id: user.id,
      coupon_id: coupon.id,
      offer_id: offerId,
    })
    .select('id, used_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({
    claimed: true,
    already_claimed: false,
    voucher_code: generateEsrVoucherCode(offerId),
    claimed_at: redemption.used_at,
    message: 'Voucher claimed. Show this code at checkout.',
  })
}
