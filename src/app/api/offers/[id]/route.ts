import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient , getApiUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)

  const { data: offer, error } = await supabase
    .from('offers')
    .select(`*, restaurants(*, categories(name)), reviews(*, profiles(full_name, image_url), review_images(image_url)), coupons(id, code, active)`)
    .eq('id', id)
    .eq('approval_status', true)
    .single()

  if (error) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

  // Compute is_redeemable for authenticated user
  let is_redeemable = offer.is_redeemable && !offer.is_bumper
  let can_review = !offer.is_bumper
  if (user && is_redeemable) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: todayCount } = await supabase
      .from('user_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('used_at', twentyFourHoursAgo)

    const { count: offerCount } = await supabase
      .from('user_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('offer_id', id)
      .gte('used_at', twentyFourHoursAgo)

    if ((todayCount ?? 0) >= 5 || (offerCount ?? 0) > 0) {
      is_redeemable = false
    }

    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('offer_id', id)

    if ((reviewCount ?? 0) > 0) can_review = false
  }

  const ratings = offer.reviews
    .map((r) => r.rating_overall)
    .filter((n): n is number => n != null)
  const avg_rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  return NextResponse.json({ ...offer, is_redeemable, can_review, avg_rating })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('offers')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = await createAdminClient()
  const { error } = await adminClient.from('offers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Deleted' })
}
