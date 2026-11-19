import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'

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

  const { data: loadedCoupons, error: couponsError } = await admin
    .from('coupons')
    .select('id, code, active')
    .eq('offer_id', offerId)
    .eq('active', true)
    .limit(1)

  if (couponsError) {
    return NextResponse.json({ error: 'Could not load a voucher for this offer.' }, { status: 500 })
  }

  let coupons = loadedCoupons
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
  if (!coupon?.code) {
    return NextResponse.json({ error: 'The active voucher does not have a code.' }, { status: 500 })
  }
  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: existing, error: existingError } = await admin
    .from('user_coupons')
    .select('id, used_at, coupon_id')
    .eq('user_id', user.id)
    .eq('offer_id', offerId)
    .gte('used_at', ago24h)
    .order('used_at', { ascending: false })
    .limit(1)

  if (existingError) {
    return NextResponse.json({ error: 'Could not check your existing voucher claim.' }, { status: 500 })
  }

  if (existing?.length) {
    const { data: existingCoupon, error: existingCouponError } = await admin
      .from('coupons')
      .select('code')
      .eq('id', existing[0].coupon_id)
      .maybeSingle()
    if (existingCouponError || !existingCoupon?.code) {
      return NextResponse.json({ error: 'Could not load your existing voucher code.' }, { status: 500 })
    }
    return NextResponse.json({
      claimed: true,
      already_claimed: true,
      voucher_code: existingCoupon.code,
      claimed_at: existing[0].used_at,
      message: 'You already claimed this voucher today. Show this code at checkout.',
    })
  }

  const { count: todayCount, error: countError } = await admin
    .from('user_coupons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('used_at', ago24h)

  if (countError) {
    return NextResponse.json({ error: 'Could not check your voucher claim limit.' }, { status: 500 })
  }

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
    voucher_code: coupon.code,
    claimed_at: redemption.used_at,
    message: 'Voucher claimed. Show this code at checkout.',
  })
}
