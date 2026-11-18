export type FeedStory = {
  id: string
  userId: string
  name: string
  avatar: string
  hasNew?: boolean
  mediaUrl?: string
  mediaType: 'image' | 'video' | 'embed'
  caption?: string
  source: 'esr' | 'instagram' | 'facebook'
  externalUrl?: string
  embedUrl?: string
  createdAt: string
}

export type StoryGroup = {
  userId: string
  name: string
  avatar: string
  hasNew: boolean
  items: FeedStory[]
}

export type FeedPost = {
  id: string
  userId?: string
  userName: string
  userAvatar: string
  restaurantId?: string
  restaurantName: string
  offerName?: string
  rating: number
  text: string
  image?: string
  verified?: boolean
  createdAt?: string
  likes: number
  likedByMe: boolean
  commentCount: number
}

export type FeedComment = {
  id: string
  reviewId: string
  userId: string
  userName: string
  userAvatar: string
  body: string
  createdAt: string
}

export type FeedUser = {
  id: string
  name: string
  avatar: string
}

export type FeedRestaurant = {
  id: string
  name: string
  city?: string | null
  image?: string | null
}

export type FeedDiscount = {
  id: string
  name: string
  restaurantId: string
  restaurantName: string
  city: string | null
  image: string | null
  discountPercent: number
}
