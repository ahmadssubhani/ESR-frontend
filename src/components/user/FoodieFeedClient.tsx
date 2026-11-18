'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  groupStories,
  mapDbStory,
  mapReviewToFeedPost,
  type DbReview,
  type DbStory,
} from '@/lib/foodie-feed'
import FeedStories from '@/components/user/feed/FeedStories'
import FeedPostCard from '@/components/user/feed/FeedPostCard'
import ReviewComposer from '@/components/user/feed/ReviewComposer'
import type { FeedDiscount, FeedPost, FeedRestaurant, FeedStory, FeedUser } from '@/components/user/feed/types'

interface Props {
  initialStories: FeedStory[]
  initialPosts: FeedPost[]
  currentUser: FeedUser
  restaurants: FeedRestaurant[]
  latestDiscounts: FeedDiscount[]
  demoMode?: boolean
}

function subscribeToRecentRestaurants(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('esr-recent-restaurants-updated', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('esr-recent-restaurants-updated', onChange)
  }
}

function getRecentRestaurantSnapshot() {
  return localStorage.getItem('esr_recent_restaurants') || '[]'
}

function getServerRecentRestaurantSnapshot() {
  return '[]'
}

export default function FoodieFeedClient({
  initialStories,
  initialPosts,
  currentUser,
  restaurants,
  latestDiscounts,
  demoMode = false,
}: Props) {
  const [stories, setStories] = useState(initialStories)
  const [posts, setPosts] = useState(initialPosts)
  const [composerOpen, setComposerOpen] = useState(false)
  const recentSnapshot = useSyncExternalStore(
    subscribeToRecentRestaurants,
    getRecentRestaurantSnapshot,
    getServerRecentRestaurantSnapshot
  )

  useEffect(() => {
    setStories(initialStories)
  }, [initialStories])

  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  const recentRestaurantIds = useMemo(() => {
    try {
      const recent: unknown = JSON.parse(recentSnapshot)
      return Array.isArray(recent)
        ? recent.filter((id): id is string => typeof id === 'string')
        : []
    } catch (error) {
      console.error('Could not read recently viewed restaurants:', error)
      return []
    }
  }, [recentSnapshot])

  useEffect(() => {
    if (demoMode) return
    const supabase = createClient()
    const channel = supabase
      .channel('foodie-feed-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, async (payload) => {
        const id = (payload.new as { id?: string }).id
        if (!id) return
        const { data } = await supabase
          .from('reviews')
          .select(
            'id, user_id, comment, rating_overall, created_at, profiles(full_name, image_url), restaurants(id, name, cover_url), offers(name, image_url), review_images(image_url), review_likes(user_id), review_comments(id)'
          )
          .eq('id', id)
          .eq('is_active', true)
          .maybeSingle()
        if (!data) return
        const mapped = mapReviewToFeedPost(data as DbReview, currentUser.id)
        if (!mapped) return
        setPosts((prev) => (prev.some((post) => post.id === mapped.id) ? prev : [mapped, ...prev]))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_likes' }, (payload) => {
        const row = (payload.new || payload.old) as { review_id?: string; user_id?: string }
        if (!row.review_id) return
        const own = row.user_id === currentUser.id
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== row.review_id) return post
            if (payload.eventType === 'INSERT') {
              return {
                ...post,
                likes: own ? post.likes : post.likes + 1,
                likedByMe: own ? true : post.likedByMe,
              }
            }
            if (payload.eventType === 'DELETE') {
              return {
                ...post,
                likes: own ? post.likes : Math.max(0, post.likes - 1),
                likedByMe: own ? false : post.likedByMe,
              }
            }
            return post
          })
        )
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'review_comments' }, (payload) => {
        const row = payload.new as { review_id?: string; user_id?: string }
        if (!row.review_id || row.user_id === currentUser.id) return
        setPosts((prev) =>
          prev.map((post) => (post.id === row.review_id ? { ...post, commentCount: post.commentCount + 1 } : post))
        )
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_stories' }, async (payload) => {
        const id = (payload.new as { id?: string }).id
        if (!id) return
        const { data } = await supabase
          .from('feed_stories')
          .select(
            'id, user_id, media_url, media_type, caption, source, external_url, embed_url, created_at, profiles(full_name, image_url)'
          )
          .eq('id', id)
          .maybeSingle()
        if (!data) return
        const mapped = mapDbStory(data as DbStory)
        setStories((prev) => (prev.some((story) => story.id === mapped.id) ? prev : [mapped, ...prev]))
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUser.id, demoMode])

  const groups = useMemo(() => groupStories(stories), [stories])
  const recentlyViewed = recentRestaurantIds
    .map((id) => restaurants.find((restaurant) => restaurant.id === id))
    .filter((restaurant): restaurant is FeedRestaurant => Boolean(restaurant))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="pb-1">
        <p className="esr-eyebrow">Good food, shared honestly</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Foodie Feed</h1>
        {demoMode && (
          <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--plum)]">
            Interactive demo · posts, likes, comments, and stories are previewed locally.
          </p>
        )}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.7fr)_minmax(220px,0.95fr)]">
        <aside aria-label="Recently viewed restaurants" className="order-2 space-y-4 lg:order-1">
          <section className="esr-card p-5">
            <h2 className="esr-serif text-xl font-bold">Recently viewed</h2>
            {recentlyViewed.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Restaurants you open will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentlyViewed.map((restaurant) => (
                  <li key={restaurant.id}>
                    <Link href="/user/offers" className="flex min-h-11 items-center gap-3 text-sm font-bold text-[var(--plum)] hover:text-[var(--crimson)]">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                        {restaurant.image && <Image src={restaurant.image} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      {restaurant.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/user/offers" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--crimson)] hover:underline">
              Explore restaurants <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </aside>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          <FeedStories
            groups={groups}
            currentUser={currentUser}
            demoMode={demoMode}
            onStoryPosted={(story) =>
              setStories((prev) => (prev.some((item) => item.id === story.id) ? prev : [story, ...prev]))
            }
          />

          <section aria-labelledby="latest-feed-heading" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 id="latest-feed-heading" className="esr-eyebrow">Latest from the community</h2>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[var(--crimson)] hover:underline"
              >
                <PenLine aria-hidden="true" size={16} />
                Write a review
              </button>
            </div>

            {posts.length === 0 && (
              <div className="esr-card p-8 text-center">
                <p className="font-bold text-[var(--plum)]">No reviews yet</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Be the first to share a meal on ESR.</p>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="esr-primary-button mt-4 px-5 py-2.5"
                >
                  Write a review
                </button>
              </div>
            )}

            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                demoMode={demoMode}
                onPostChange={(next) =>
                  setPosts((prev) => prev.map((item) => (item.id === next.id ? next : item)))
                }
              />
            ))}
          </section>
        </div>

        <aside aria-label="Restaurant recommendations and discounts" className="order-3 space-y-4">
          <section className="esr-card p-5">
            <h2 className="esr-serif text-xl font-bold">Worth exploring</h2>
            {restaurants.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Restaurants will appear here soon.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {restaurants.slice(0, 3).map((restaurant) => (
                  <li key={restaurant.id}>
                    <Link href="/user/offers" className="flex min-h-12 items-center gap-3 rounded-lg text-sm text-[var(--plum)] hover:text-[var(--crimson)]">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                        {restaurant.image && <Image src={restaurant.image} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{restaurant.name}</span>
                        <span className="block truncate text-sm text-[var(--muted)]">{restaurant.city || 'Pakistan'}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/user/offers" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--crimson)] hover:underline">
              Explore all restaurants <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>

          <section className="esr-card p-5">
            <h2 className="esr-serif text-xl font-bold">Latest discounts</h2>
            {latestDiscounts.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">New restaurant discounts will appear here.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {latestDiscounts.map((discount) => (
                  <li key={discount.id}>
                    <Link href="/user/offers" className="flex min-h-12 items-center gap-3 rounded-lg text-sm text-[var(--plum)] hover:text-[var(--crimson)]">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-muted)]">
                        {discount.image && <Image src={discount.image} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{discount.restaurantName}</span>
                        <span className="block text-sm font-semibold text-[var(--crimson)]">{discount.discountPercent}% off</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/user/offers" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--crimson)] hover:underline">
              Browse discounts <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </aside>
      </div>

      {composerOpen && (
        <ReviewComposer
          restaurants={restaurants}
          currentUser={currentUser}
          demoMode={demoMode}
          onClose={() => setComposerOpen(false)}
          onPosted={(post) => {
            const withMe = {
              ...post,
              userName: currentUser.name || post.userName,
              userAvatar: currentUser.avatar || post.userAvatar,
              likedByMe: false,
              likes: post.likes || 0,
              commentCount: post.commentCount || 0,
            }
            setPosts((prev) => [withMe, ...prev.filter((item) => item.id !== withMe.id)])
            setComposerOpen(false)
          }}
        />
      )}
    </div>
  )
}

export type { FeedPost, FeedStory }
