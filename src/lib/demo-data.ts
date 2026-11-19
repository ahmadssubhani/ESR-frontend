import type { Offer } from '@/types/database'
import type { FeedDiscount, FeedPost, FeedRestaurant, FeedUser } from '@/components/user/feed/types'

export interface DemoOffer extends Offer {
  restaurants: {
    id: string
    name: string
    city: string
    address: string
    lat: number
    lng: number
    cover_url: string
    logo_url: string
    is_featured: boolean
    categories: { name: string }
  }
}

const now = Date.now()
const createdAt = (hoursAgo: number) => new Date(now - hoursAgo * 60 * 60 * 1000).toISOString()
const validFrom = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
const validTill = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()

const restaurants = [
  {
    id: 'demo-karachi-karahi',
    name: 'Karachi Karahi House',
    city: 'Karachi',
    address: 'Clifton',
    lat: 24.8138,
    lng: 67.0305,
    cover_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: true,
    categories: { name: 'Pakistani' },
  },
  {
    id: 'demo-bun-kabab',
    name: 'Bun Kabab Social',
    city: 'Karachi',
    address: 'DHA Phase 6',
    lat: 24.8012,
    lng: 67.0631,
    cover_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: true,
    categories: { name: 'Burgers' },
  },
  {
    id: 'demo-lahori-dastarkhwan',
    name: 'Lahori Dastarkhwan',
    city: 'Lahore',
    address: 'Gulberg III',
    lat: 31.5143,
    lng: 74.3544,
    cover_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: true,
    categories: { name: 'Pakistani' },
  },
  {
    id: 'demo-oven-story',
    name: 'The Oven Story',
    city: 'Islamabad',
    address: 'F-7 Markaz',
    lat: 33.7215,
    lng: 73.0573,
    cover_url: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: true,
    categories: { name: 'Pizza' },
  },
  {
    id: 'demo-margalla-table',
    name: 'Margalla Table',
    city: 'Islamabad',
    address: 'F-6',
    lat: 33.7294,
    lng: 73.0766,
    cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: true,
    categories: { name: 'Continental' },
  },
  {
    id: 'demo-charcoal-corner',
    name: 'Charcoal Corner',
    city: 'Lahore',
    address: 'Johar Town',
    lat: 31.4697,
    lng: 74.2728,
    cover_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',
    logo_url: '',
    is_featured: false,
    categories: { name: 'BBQ' },
  },
]

const offerDetails = [
  { restaurant: 0, name: 'Karahi for Two', original: 2000, discounted: 1500, hoursAgo: 3 },
  { restaurant: 1, name: 'Classic Bun Kabab Combo', original: 2250, discounted: 1800, hoursAgo: 6 },
  { restaurant: 2, name: 'Lahori Dinner for Two', original: 3000, discounted: 2100, hoursAgo: 12 },
  { restaurant: 3, name: 'Wood-fired Pizza', original: 2000, discounted: 1700, hoursAgo: 18 },
  { restaurant: 4, name: 'Weekend Table Special', original: 3200, discounted: 2400, hoursAgo: 24 },
  { restaurant: 5, name: 'Mixed Grill Platter', original: 2800, discounted: 2100, hoursAgo: 36 },
]

export const DEMO_OFFERS: DemoOffer[] = offerDetails.map((details) => ({
  id: `demo-offer-${restaurants[details.restaurant].id}`,
  restaurant_id: restaurants[details.restaurant].id,
  name: details.name,
  description: `Save on ${details.name.toLowerCase()} at ${restaurants[details.restaurant].name}.`,
  original_price: details.original,
  discounted_price: details.discounted,
  image_url: restaurants[details.restaurant].cover_url,
  valid_from: validFrom,
  valid_till: validTill,
  approval_status: true,
  is_bumper: false,
  is_redeemable: true,
  created_at: createdAt(details.hoursAgo),
  updated_at: createdAt(details.hoursAgo),
  restaurants: restaurants[details.restaurant],
}))

export const DEMO_RESTAURANTS: FeedRestaurant[] = restaurants.map((restaurant) => ({
  id: restaurant.id,
  name: restaurant.name,
  city: restaurant.city,
  area: restaurant.address,
  image: restaurant.cover_url,
}))

export const DEMO_DISCOUNTS: FeedDiscount[] = DEMO_OFFERS.slice(0, 3).map((offer) => ({
  id: offer.id,
  name: offer.name,
  restaurantId: offer.restaurant_id,
  restaurantName: offer.restaurants.name,
  city: offer.restaurants.city,
  image: offer.restaurants.cover_url,
  discountPercent: Math.ceil(100 - (offer.discounted_price / offer.original_price) * 100),
}))

export const DEMO_USER: FeedUser = {
  id: 'demo-diner',
  name: 'Ayesha Khan',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
}

export const DEMO_POSTS: FeedPost[] = [
  {
    id: 'demo-review-karahi',
    userId: 'demo-ayesha',
    userName: 'Ayesha Khan',
    userAvatar: DEMO_USER.avatar,
    restaurantId: restaurants[0].id,
    restaurantName: restaurants[0].name,
    offerName: offerDetails[0].name,
    rating: 4.8,
    text: 'The chicken karahi came out sizzling and had a lovely ginger kick. Two of us shared a half portion with naan and still had some left.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=85',
    verified: true,
    createdAt: createdAt(5),
    likes: 24,
    likedByMe: false,
    commentCount: 3,
  },
  {
    id: 'demo-review-burger',
    userId: 'demo-usman',
    userName: 'Usman Chaudhry',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    restaurantId: restaurants[1].id,
    restaurantName: restaurants[1].name,
    offerName: offerDetails[1].name,
    rating: 4.6,
    text: 'Crispy, spicy, and exactly the kind of bun kabab I was hoping for. The deal made it even better.',
    image: restaurants[1].cover_url,
    verified: true,
    createdAt: createdAt(20),
    likes: 16,
    likedByMe: false,
    commentCount: 2,
  },
  {
    id: 'demo-review-biryani',
    userId: 'demo-sana',
    userName: 'Sana Malik',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    restaurantId: restaurants[2].id,
    restaurantName: restaurants[2].name,
    offerName: offerDetails[2].name,
    rating: 4.9,
    text: 'The biryani was fragrant, beautifully spiced, and generous enough to share. I would happily come back for it.',
    image: 'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=1200&q=85',
    verified: true,
    createdAt: createdAt(28),
    likes: 31,
    likedByMe: false,
    commentCount: 4,
  },
  {
    id: 'demo-review-pizza',
    userId: 'demo-hamza',
    userName: 'Hamza Raza',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    restaurantId: restaurants[3].id,
    restaurantName: restaurants[3].name,
    offerName: offerDetails[3].name,
    rating: 4.7,
    text: 'A crisp, bubbly crust with plenty of flavour in every bite. The wood-fired finish made this one a favourite.',
    image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=85',
    verified: true,
    createdAt: createdAt(34),
    likes: 19,
    likedByMe: false,
    commentCount: 1,
  },
  {
    id: 'demo-review-dessert',
    userId: 'demo-zoya',
    userName: 'Zoya Ahmed',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    restaurantId: restaurants[4].id,
    restaurantName: restaurants[4].name,
    offerName: offerDetails[4].name,
    rating: 4.8,
    text: 'We finished the meal with a rich chocolate dessert that was light, creamy, and just sweet enough.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85',
    verified: true,
    createdAt: createdAt(42),
    likes: 22,
    likedByMe: false,
    commentCount: 2,
  },
]
