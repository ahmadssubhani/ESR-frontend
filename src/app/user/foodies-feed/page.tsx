import type { Metadata } from 'next'
import FoodieFeedClient from '@/components/user/FoodieFeedClient'
import { DEFAULT_AVATAR, mapDbPost, type DbPost } from '@/lib/foodie-feed'
import { createClient } from '@/lib/supabase/server'
import type { FeedDiscount, FeedRestaurant, FeedUser } from '@/components/user/feed/types'

export const metadata: Metadata = {
  title: 'Foodie Feed | ESR',
  description: 'Read restaurant posts and ratings from diners across Pakistan.',
}

export default async function FoodieFeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) throw new Error(`Could not load your sign-in session: ${authError.message}`)

  const [postsResult, restaurantsResult, offersResult, profileResult, viewsResult] = await Promise.all([
    supabase
      .from('posts')
      .select(
        'id, author_id, restaurant_id, image_url, rating, caption, created_at, profiles!posts_author_id_fkey(full_name, image_url, avatar_url), restaurants!posts_restaurant_id_fkey(id, name, city), post_likes(user_id), post_comments(id)'
      )
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('restaurants')
      .select('id, name, city, cover_url')
      .eq('is_active', true)
      .order('name')
      .limit(100),
    supabase
      .from('offers')
      .select('id, name, restaurant_id, original_price, discounted_price, restaurants!inner(id, name, city, cover_url)')
      .eq('approval_status', true)
      .eq('is_redeemable', true)
      .eq('is_bumper', false)
      .lte('valid_from', new Date().toISOString())
      .gte('valid_till', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    user
      ? supabase.from('profiles').select('full_name, image_url, avatar_url').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? supabase.from('restaurant_views').select('restaurant_id, viewed_at').eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(30)
      : Promise.resolve({ data: [], error: null }),
  ])

  for (const result of [postsResult, restaurantsResult, offersResult, profileResult, viewsResult]) {
    if (result.error) throw new Error(`Could not load the Foodie Feed: ${result.error.message}`)
  }

  const restaurantRows = restaurantsResult.data || []
  const restaurants: FeedRestaurant[] = restaurantRows.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.city,
    image: restaurant.cover_url,
  }))
  const restaurantMap = new Map(restaurantRows.map((restaurant) => [restaurant.id, restaurant]))
  const latestDiscounts: FeedDiscount[] = (offersResult.data || [])
    .map((offer) => {
      const restaurant = restaurantMap.get(offer.restaurant_id)
      if (!restaurant) return null
      return {
        id: offer.id,
        name: offer.name,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        city: restaurant.city,
        image: restaurant.cover_url,
        discountPercent:
          offer.original_price > 0
            ? Math.ceil(100 - (offer.discounted_price / offer.original_price) * 100)
            : 0,
      }
    })
    .filter((offer): offer is FeedDiscount => offer !== null)
    .slice(0, 3)

  const initialPosts = ((postsResult.data || []) as unknown as DbPost[]).map((post) =>
    mapDbPost(post, user?.id)
  )
  const initialRecentIds = Array.from(
    new Set((viewsResult.data || []).map((view) => view.restaurant_id))
  )
  const profile = profileResult.data
  const currentUser: FeedUser = {
    id: user?.id || '',
    name: profile?.full_name || 'Foodie',
    avatar: profile?.avatar_url || profile?.image_url || DEFAULT_AVATAR,
  }

  return (
    <FoodieFeedClient
      initialPosts={initialPosts}
      currentUser={currentUser}
      restaurants={restaurants}
      latestDiscounts={latestDiscounts}
      initialRecentIds={initialRecentIds}
    />
  )
}
