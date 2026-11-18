'use client'

import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { mapReviewToFeedPost, type DbReview } from '@/lib/foodie-feed'
import type { FeedPost, FeedRestaurant, FeedUser } from '@/components/user/feed/types'

interface Props {
  restaurants: FeedRestaurant[]
  currentUser: FeedUser
  onClose: () => void
  onPosted: (post: FeedPost) => void
  demoMode?: boolean
}

export default function ReviewComposer({ restaurants, currentUser, onClose, onPosted, demoMode = false }: Props) {
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id || '')
  const [offers, setOffers] = useState<{ id: string; name: string }[]>([])
  const [offerId, setOfferId] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (demoMode) return
    if (!restaurantId) {
      setOffers([])
      setOfferId('')
      return
    }
    fetch(`/api/offers/by-restaurant/${restaurantId}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data.map((row: { id: string; name: string }) => ({ id: row.id, name: row.name }))
          : []
        setOffers(list)
        setOfferId('')
      })
      .catch(() => setOffers([]))
  }, [restaurantId, demoMode])

  async function submit() {
    if (!restaurantId) {
      toast.error('Pick a restaurant first.')
      return
    }
    if (!comment.trim()) {
      toast.error('Write a short review.')
      return
    }
    setLoading(true)
    try {
      if (demoMode) {
        const restaurant = restaurants.find((item) => item.id === restaurantId)
        const post: FeedPost = {
          id: `demo-review-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          restaurantId,
          restaurantName: restaurant?.name || 'Local Restaurant',
          rating,
          text: comment.trim(),
          image: file ? URL.createObjectURL(file) : restaurant?.image || undefined,
          createdAt: new Date().toISOString(),
          likes: 0,
          likedByMe: false,
          commentCount: 0,
        }
        onPosted(post)
        toast.success('Demo review added to the feed')
        return
      }

      let images: string[] = []
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `feed/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('review-images').upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })
        if (error) throw new Error(error.message)
        const {
          data: { publicUrl },
        } = supabase.storage.from('review-images').getPublicUrl(path)
        images = [publicUrl]
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          offer_id: offerId || null,
          comment: comment.trim(),
          rating_overall: rating,
          rating_taste: rating,
          rating_ambiance: rating,
          rating_quality: rating,
          rating_money_value: rating,
          images,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not post review')

      const restaurantName = restaurants.find((r) => r.id === restaurantId)?.name || 'Local Restaurant'
      const offerName = offers.find((o) => o.id === offerId)?.name
      const mapped = mapReviewToFeedPost(data as DbReview, currentUser.id)
      onPosted({
        id: mapped?.id || data?.id || crypto.randomUUID(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        restaurantId,
        restaurantName,
        offerName: offerName || mapped?.offerName,
        rating,
        text: comment.trim(),
        image: images[0] || mapped?.image,
        verified: true,
        createdAt: mapped?.createdAt || new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        commentCount: 0,
      })
      toast.success('Review posted to the feed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900">Write a review</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <label className="block text-xs font-bold text-gray-500 mb-1">Restaurant</label>
        <select
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
        >
          {restaurants.length === 0 && <option value="">No restaurants yet</option>}
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>

        {offers.length > 0 && (
          <>
            <label className="block text-xs font-bold text-gray-500 mb-1">Offer (optional)</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
            >
              <option value="">General visit</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          </>
        )}

        <p className="text-xs font-bold text-gray-500 mb-1">Rating</p>
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} className="p-0.5">
              <Star
                size={22}
                className={value <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="How was the food, vibe, and value?"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-bold text-red-600 cursor-pointer">
          {file ? file.name : '+ Add a photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-full disabled:opacity-60"
        >
          {loading ? 'Posting…' : 'Post review'}
        </button>
      </div>
    </div>
  )
}
