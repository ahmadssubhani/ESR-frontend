import type { Metadata } from 'next'
import FoodieFeedClient from '@/components/user/FoodieFeedClient'
import { DEMO_DISCOUNTS, DEMO_POSTS, DEMO_RESTAURANTS, DEMO_USER } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_AVATAR,
  buildFeedPosts,
  mapDbStory,
  storiesFromReviewPhotos,
} from '@/lib/foodie-feed'
import { loadFoodieFeedReviews, loadFoodieFeedStories } from '@/lib/load-foodie-feed'
import type { FeedStory } from '@/components/user/feed/types'

export const metadata: Metadata = {
  title: 'Foodie Feed | ESR',
  description: 'Read sample restaurant reviews from food lovers around Pakistan.',
}

export default async function FoodieFeedPage() {
  let initialPosts = DEMO_POSTS
  let restaurants = DEMO_RESTAURANTS
  let latestDiscounts = DEMO_DISCOUNTS
  let initialStories: FeedStory[] = []
  let currentUser = DEMO_USER
  let demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

  if (!demoMode) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw authError

      const [{ data: profile }, { data: restaurantRows }, reviewRows, storyRows] = await Promise.all([
        user
          ? supabase.from('profiles').select('full_name, image_url').eq('id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('restaurants')
          .select('id, name, city, cover_url')
          .eq('is_active', true)
          .order('name')
          .limit(100),
        loadFoodieFeedReviews(),
        loadFoodieFeedStories(),
      ])
      const liveRestaurants = restaurantRows || []
      const { data: discountRows, error: discountError } = await supabase
        .from('offers')
        .select('id, name, restaurant_id, original_price, discounted_price')
        .eq('approval_status', true)
        .eq('is_redeemable', true)
        .eq('is_bumper', false)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_till', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
      if (discountError) throw discountError

      restaurants = liveRestaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        image: restaurant.cover_url,
      }))
      initialPosts = buildFeedPosts(reviewRows, user?.id)
      latestDiscounts = (discountRows || [])
        .map((offer) => {
          const restaurant = liveRestaurants.find((item) => item.id === offer.restaurant_id)
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
        .filter((offer) => offer !== null)
        .slice(0, 3)
      const postedStories = storyRows.map(mapDbStory)
      initialStories = [
        ...postedStories,
        ...storiesFromReviewPhotos(reviewRows).filter(
          (story) => !postedStories.some((posted) => posted.userId === story.userId)
        ),
      ]
      currentUser = {
        id: user?.id || '',
        name: profile?.full_name || 'You',
        avatar: profile?.image_url || DEFAULT_AVATAR,
      }
    } catch (error) {
      console.error('Live foodie feed unavailable; showing demo feed instead:', error)
      demoMode = true
    }
  }

  return (
    <FoodieFeedClient
      initialStories={initialStories}
      initialPosts={initialPosts}
      currentUser={currentUser}
      restaurants={restaurants}
      latestDiscounts={latestDiscounts}
      demoMode={demoMode}
    />
  )
}
