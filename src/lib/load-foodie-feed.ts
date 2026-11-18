import { createServiceClient } from '@/lib/supabase/server'
import type { DbReview, DbStory } from '@/lib/foodie-feed'

type ReviewRow = {
  id: string
  user_id: string | null
  restaurant_id: string
  offer_id: string | null
  comment: string | null
  rating_overall: number | null
  created_at: string
  is_active: boolean
}

export async function loadFoodieFeedReviews(): Promise<DbReview[]> {
  const admin = createServiceClient()

  const { data: reviews, error } = await admin
    .from('reviews')
    .select('id, user_id, restaurant_id, offer_id, comment, rating_overall, created_at, is_active')
    .or('is_active.eq.true,is_active.is.null')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error || !reviews?.length) return []

  const rows = reviews as ReviewRow[]
  const reviewIds = rows.map((row) => row.id)
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[]
  const restaurantIds = [...new Set(rows.map((row) => row.restaurant_id).filter(Boolean))]
  const offerIds = [...new Set(rows.map((row) => row.offer_id).filter(Boolean))] as string[]

  const [profiles, restaurants, offers, images, likes, comments] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, full_name, image_url').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; image_url: string | null }[] }),
    restaurantIds.length
      ? admin.from('restaurants').select('id, name, cover_url').in('id', restaurantIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; cover_url: string | null }[] }),
    offerIds.length
      ? admin.from('offers').select('id, name, image_url').in('id', offerIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; image_url: string | null }[] }),
    admin.from('review_images').select('review_id, image_url').in('review_id', reviewIds),
    admin.from('review_likes').select('review_id, user_id').in('review_id', reviewIds),
    admin.from('review_comments').select('id, review_id').in('review_id', reviewIds),
  ])

  const profileMap = new Map((profiles.data || []).map((row) => [row.id, row]))
  const restaurantMap = new Map((restaurants.data || []).map((row) => [row.id, row]))
  const offerMap = new Map((offers.data || []).map((row) => [row.id, row]))

  const imagesByReview = new Map<string, { image_url: string }[]>()
  for (const row of images.data || []) {
    const list = imagesByReview.get(row.review_id) || []
    list.push({ image_url: row.image_url })
    imagesByReview.set(row.review_id, list)
  }

  const likesByReview = new Map<string, { user_id: string }[]>()
  for (const row of likes.data || []) {
    const list = likesByReview.get(row.review_id) || []
    list.push({ user_id: row.user_id })
    likesByReview.set(row.review_id, list)
  }

  const commentsByReview = new Map<string, { id: string }[]>()
  for (const row of comments.data || []) {
    const list = commentsByReview.get(row.review_id) || []
    list.push({ id: row.id })
    commentsByReview.set(row.review_id, list)
  }

  return rows.map((row) => {
    const profile = row.user_id ? profileMap.get(row.user_id) : undefined
    const restaurant = restaurantMap.get(row.restaurant_id)
    const offer = row.offer_id ? offerMap.get(row.offer_id) : undefined
    return {
      id: row.id,
      user_id: row.user_id,
      comment: row.comment,
      rating_overall: row.rating_overall,
      created_at: row.created_at,
      profiles: profile
        ? { full_name: profile.full_name, image_url: profile.image_url }
        : null,
      restaurants: restaurant
        ? { id: restaurant.id, name: restaurant.name, cover_url: restaurant.cover_url }
        : null,
      offers: offer ? { name: offer.name, image_url: offer.image_url } : null,
      review_images: imagesByReview.get(row.id) || [],
      review_likes: likesByReview.get(row.id) || [],
      review_comments: commentsByReview.get(row.id) || [],
    } satisfies DbReview
  })
}

export async function loadFoodieFeedStories(): Promise<DbStory[]> {
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('feed_stories')
    .select('id, user_id, media_url, media_type, caption, source, external_url, embed_url, created_at, expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(40)

  if (error || !data?.length) return []

  const userIds = [...new Set(data.map((row) => row.user_id))]
  const { data: profiles } = await admin.from('profiles').select('id, full_name, image_url').in('id', userIds)
  const profileMap = new Map((profiles || []).map((row) => [row.id, row]))

  return data.map((row) => {
    const profile = profileMap.get(row.user_id)
    return {
      id: row.id,
      user_id: row.user_id,
      media_url: row.media_url,
      media_type: row.media_type,
      caption: row.caption,
      source: row.source,
      external_url: row.external_url,
      embed_url: row.embed_url,
      created_at: row.created_at,
      profiles: profile
        ? { full_name: profile.full_name, image_url: profile.image_url }
        : null,
    } satisfies DbStory
  })
}
