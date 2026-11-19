'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { mapDbPost, type DbPost } from '@/lib/foodie-feed'
import type { FeedPost, FeedRestaurant, FeedUser } from '@/components/user/feed/types'

interface Props {
  restaurants: FeedRestaurant[]
  currentUser: FeedUser
  onClose: () => void
  onPosted: (post: FeedPost) => void
}

const POST_IMAGE_LIMIT = 10 * 1024 * 1024
const POST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export default function ReviewComposer({ restaurants, currentUser, onClose, onPosted }: Props) {
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id || '')
  const [rating, setRating] = useState(5)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!restaurantId) {
      setError('Choose a restaurant.')
      return
    }
    if (!caption.trim()) {
      setError('Write a caption for your post.')
      return
    }
    if (!file) {
      setError('Choose a photo for your post.')
      return
    }
    if (!POST_IMAGE_TYPES.includes(file.type) || file.size > POST_IMAGE_LIMIT) {
      setError('Choose a JPG, PNG, WebP, or AVIF photo smaller than 10 MB.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user || user.id !== currentUser.id) {
        setError('Sign in again before creating a post.')
        return
      }

      const extension = file.type.split('/')[1] || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: image } = supabase.storage.from('post-images').getPublicUrl(uploaded.path)

      const { data, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          restaurant_id: restaurantId,
          image_url: image.publicUrl,
          rating,
          caption: caption.trim(),
        })
        .select(
          'id, author_id, restaurant_id, image_url, rating, caption, created_at, profiles!posts_author_id_fkey(full_name, image_url, avatar_url), restaurants!posts_restaurant_id_fkey(id, name, city), post_likes(user_id), post_comments(id)'
        )
        .single()
      if (postError) throw postError

      onPosted(mapDbPost(data as unknown as DbPost, user.id))
      toast.success('Post shared')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Your post could not be shared.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[var(--plum)]/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="esr-serif text-2xl text-[var(--plum)]">Create a post</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">
                Share a restaurant photo, rating, and caption.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close post form" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--plum)]">
                <X aria-hidden="true" size={20} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="post-restaurant" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Restaurant</label>
              <select
                id="post-restaurant"
                value={restaurantId}
                onChange={(event) => setRestaurantId(event.target.value)}
                required
                className="esr-auth-input min-h-12 w-full rounded-xl px-3 text-base"
              >
                {restaurants.length === 0 && <option value="">No restaurants available</option>}
                {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[var(--plum)]">Rating</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--crimson)] hover:bg-[var(--surface-muted)]"
                  >
                    <Star aria-hidden="true" size={20} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="post-caption" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Caption</label>
              <textarea
                id="post-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={4}
                maxLength={2000}
                required
                className="esr-auth-input w-full rounded-xl p-3 text-base"
              />
            </div>
            <div>
              <label htmlFor="post-photo" className="mb-2 block text-sm font-semibold text-[var(--plum)]">Photo</label>
              <input
                id="post-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="esr-auth-input min-h-12 w-full rounded-xl p-2 text-sm"
              />
            </div>
            {error && <p role="alert" className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--plum)]">Error: {error}</p>}
            <button type="submit" disabled={loading} className="esr-primary-button inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-base disabled:opacity-60">
              {loading ? 'Sharing post…' : 'Share post'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
