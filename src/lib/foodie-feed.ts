import type { FeedPost } from '@/components/user/feed/types'

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd722a43e?auto=format&fit=crop&w=200&q=80'

export type DbPost = {
  id: string
  author_id: string
  restaurant_id: string
  image_url: string
  rating: number
  caption: string
  created_at: string
  profiles?: {
    full_name?: string | null
    image_url?: string | null
    avatar_url?: string | null
  } | {
    full_name?: string | null
    image_url?: string | null
    avatar_url?: string | null
  }[] | null
  restaurants?: {
    id?: string | null
    name?: string | null
    city?: string | null
  } | {
    id?: string | null
    name?: string | null
    city?: string | null
  }[] | null
  post_likes?: { user_id: string }[] | null
  post_comments?: { id: string }[] | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value as T
}

export function mapDbPost(row: DbPost, currentUserId?: string): FeedPost {
  const profile = firstRelation(row.profiles)
  const restaurant = firstRelation(row.restaurants)
  const likes = row.post_likes || []

  return {
    id: row.id,
    userId: row.author_id,
    userName: profile?.full_name || 'ESR Foodie',
    userAvatar: profile?.avatar_url || profile?.image_url || DEFAULT_AVATAR,
    restaurantId: restaurant?.id || row.restaurant_id,
    restaurantName: restaurant?.name || 'Restaurant',
    restaurantCity: restaurant?.city || null,
    rating: Number(row.rating),
    text: row.caption,
    image: row.image_url,
    createdAt: row.created_at,
    likes: likes.length,
    likedByMe: currentUserId ? likes.some((like) => like.user_id === currentUserId) : false,
    commentCount: row.post_comments?.length || 0,
  }
}
