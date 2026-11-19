import type { FeedPost, FeedStory, StoryGroup } from '@/components/user/feed/types'

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'

export type DbReview = {
  id: string
  user_id?: string | null
  comment?: string | null
  rating_overall?: number | null
  created_at?: string
  profiles?: { full_name?: string | null; image_url?: string | null } | null
  restaurants?: { id?: string | null; name?: string | null; cover_url?: string | null } | null
  offers?: { name?: string | null; image_url?: string | null } | null
  review_images?: { image_url: string }[] | null
  review_likes?: { user_id: string }[] | null
  review_comments?: { id: string }[] | null
}

export type DbStory = {
  id: string
  user_id: string
  media_url?: string | null
  media_type: 'image' | 'video' | 'embed'
  caption?: string | null
  source: 'esr' | 'instagram' | 'facebook'
  external_url?: string | null
  embed_url?: string | null
  created_at: string
  profiles?: { full_name?: string | null; image_url?: string | null } | null
}

export function parseSocialMediaUrl(raw: string): {
  source: 'instagram' | 'facebook'
  embedUrl: string
  externalUrl: string
} | null {
  try {
    const url = new URL(raw.trim())
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'instagram.com' || host === 'instagr.am') {
      const parts = url.pathname.split('/').filter(Boolean)
      const type = parts[0]
      const code = parts[1]
      if (['reel', 'p', 'tv'].includes(type) && code) {
        const clean = code.replace(/\/$/, '')
        return {
          source: 'instagram',
          embedUrl: `https://www.instagram.com/${type}/${clean}/embed`,
          externalUrl: `https://www.instagram.com/${type}/${clean}/`,
        }
      }
      return null
    }

    if (
      host === 'facebook.com' ||
      host === 'fb.com' ||
      host === 'fb.watch' ||
      host.endsWith('.facebook.com')
    ) {
      const href = url.toString()
      const isVideo =
        host === 'fb.watch' ||
        /\/(reel|reels|videos|watch)\b/i.test(url.pathname + url.search)
      const plugin = isVideo ? 'video.php' : 'post.php'
      return {
        source: 'facebook',
        embedUrl: `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(href)}&show_text=false&width=360`,
        externalUrl: href,
      }
    }

    return null
  } catch {
    return null
  }
}

function unwrapProfile(
  value:
    | DbStory['profiles']
    | DbReview['profiles']
    | { full_name?: string | null; image_url?: string | null }[]
    | null
    | undefined
) {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function mapReviewToFeedPost(review: DbReview | null | undefined, currentUserId?: string): FeedPost | null {
  if (!review?.id) return null
  const profile = unwrapProfile(review.profiles)
  const image = review.review_images?.[0]?.image_url || undefined
  const likes = review.review_likes ?? []

  return {
    id: review.id,
    userId: review.user_id || undefined,
    userName: profile?.full_name || 'ESR Foodie',
    userAvatar: profile?.image_url || DEFAULT_AVATAR,
    restaurantId: review.restaurants?.id || undefined,
    restaurantName: review.restaurants?.name || 'Local Restaurant',
    offerName: review.offers?.name || undefined,
    rating: Number(review.rating_overall) || 5,
    text: review.comment || 'Shared a great dining experience on ESR.',
    image,
    verified: true,
    createdAt: review.created_at,
    likes: likes.length,
    likedByMe: currentUserId ? likes.some((like) => like.user_id === currentUserId) : false,
    commentCount: review.review_comments?.length ?? 0,
  }
}

export function mapDbStory(story: DbStory): FeedStory {
  const profile = unwrapProfile(story.profiles)
  return {
    id: story.id,
    userId: story.user_id,
    name: profile?.full_name || 'Foodie',
    avatar: profile?.image_url || DEFAULT_AVATAR,
    hasNew: true,
    mediaUrl: story.media_url || undefined,
    mediaType: story.media_type,
    caption: story.caption || undefined,
    source: story.source,
    externalUrl: story.external_url || undefined,
    embedUrl: story.embed_url || undefined,
    createdAt: story.created_at,
  }
}

export function storiesFromReviewPhotos(reviews: DbReview[]): FeedStory[] {
  const stories: FeedStory[] = []
  for (const review of reviews) {
    const image = review.review_images?.[0]?.image_url
    if (!image) continue
    const profile = unwrapProfile(review.profiles)
    stories.push({
      id: `review-${review.id}`,
      userId: review.user_id || review.id,
      name: profile?.full_name || 'Foodie',
      avatar: profile?.image_url || DEFAULT_AVATAR,
      hasNew: true,
      mediaUrl: image,
      mediaType: 'image',
      caption: review.comment || undefined,
      source: 'esr',
      createdAt: review.created_at || new Date().toISOString(),
    })
    if (stories.length >= 12) break
  }
  return stories
}

export function groupStories(stories: FeedStory[]): StoryGroup[] {
  const groups = new Map<string, StoryGroup>()
  for (const story of stories) {
    const existing = groups.get(story.userId)
    if (existing) {
      existing.items.push(story)
      continue
    }
    groups.set(story.userId, {
      userId: story.userId,
      name: story.name,
      avatar: story.avatar,
      hasNew: story.hasNew ?? true,
      items: [story],
    })
  }
  return Array.from(groups.values())
}

export function buildFeedPosts(reviews: DbReview[], currentUserId?: string): FeedPost[] {
  return reviews
    .map((review) => mapReviewToFeedPost(review, currentUserId))
    .filter((post): post is FeedPost => post !== null)
}
