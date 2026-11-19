import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OfferDetail from '@/components/user/OfferDetail'

function getOneDayAgo() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: offer, error: offerError }, { data: savedOffer, error: savedError }] = await Promise.all([
    supabase
    .from('offers')
    .select(`*, restaurants(*, categories(name)), reviews(*, profiles(full_name, image_url), review_images(image_url)), coupons(id, code, active)`)
    .eq('id', id)
    .eq('approval_status', true)
    .maybeSingle(),
    user
      ? supabase.from('user_offers').select('offer_id').eq('user_id', user.id).eq('offer_id', id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (offerError) throw new Error(`Could not load offer: ${offerError.message}`)
  if (savedError) throw new Error(`Could not load saved offer state: ${savedError.message}`)
  if (!offer) notFound()

  // Compute is_redeemable
  let is_redeemable = offer.is_redeemable && !offer.is_bumper
  let can_review = !offer.is_bumper
  let already_claimed = false
  if (user && is_redeemable) {
    const ago24h = getOneDayAgo()
    const [{ count: todayCount }, { count: offerCount }, { count: reviewCount }] = await Promise.all([
      supabase.from('user_coupons').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('used_at', ago24h),
      supabase.from('user_coupons').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('offer_id', id).gte('used_at', ago24h),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('offer_id', id),
    ])
    already_claimed = (offerCount ?? 0) > 0
    if ((todayCount ?? 0) >= 5 && !already_claimed) is_redeemable = false
    if ((reviewCount ?? 0) > 0) can_review = false
  }

  const ratings = (offer.reviews || [])
    .map((r) => r.rating_overall)
    .filter((n): n is number => n != null)
  const avg_rating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null

  const tags: string[] = offer.restaurants?.tags || []

  return (
    <OfferDetail
      offer={{ ...offer, is_redeemable, can_review, avg_rating, already_claimed }}
      restaurantTags={tags}
      userId={user?.id ?? null}
      isSaved={Boolean(savedOffer)}
    />
  )
}
