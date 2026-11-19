export type FeedPost = {
  id: string
  userId?: string
  userName: string
  userAvatar: string
  restaurantId?: string
  restaurantName: string
  restaurantCity?: string | null
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
  postId: string
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
