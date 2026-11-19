'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FeedPostCard from '@/components/user/feed/FeedPostCard'
import ReviewComposer from '@/components/user/feed/ReviewComposer'
import type { FeedDiscount, FeedPost, FeedRestaurant, FeedUser } from '@/components/user/feed/types'

interface Props {
  initialPosts: FeedPost[]
  currentUser: FeedUser
  restaurants: FeedRestaurant[]
  latestDiscounts: FeedDiscount[]
  initialRecentIds: string[]
}

function restaurantHref(id: string) {
  return `/user/offers#restaurant/${encodeURIComponent(id)}`
}

function RestaurantList({
  restaurants,
}: {
  restaurants: FeedRestaurant[]
}) {
  return (
    <ul className="mt-4 space-y-3">
      {restaurants.map((restaurant) => (
        <li key={restaurant.id}>
          <Link
            href={restaurantHref(restaurant.id)}
            className="flex min-h-12 items-center gap-3 rounded-lg text-sm text-[var(--plum)] hover:text-[var(--crimson)]"
          >
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
  )
}

export default function FoodieFeedClient({
  initialPosts,
  currentUser,
  restaurants,
  latestDiscounts,
  initialRecentIds,
}: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [composerOpen, setComposerOpen] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState(false)
  useEffect(() => {
    // Keep interactive post state aligned with server data after router.refresh().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosts(initialPosts)
  }, [initialPosts])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('foodie-feed-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => router.refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, () => router.refresh())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router])

  const recentlyViewed = initialRecentIds
    .map((id) => restaurants.find((restaurant) => restaurant.id === id))
    .filter((restaurant): restaurant is FeedRestaurant => Boolean(restaurant))
    .slice(0, 3)
  const suggested = restaurants
    .filter((restaurant) => !recentlyViewed.some((item) => item.id === restaurant.id))
    .slice(0, Math.max(0, 3 - recentlyViewed.length))
  const recentDisplay = [...recentlyViewed, ...suggested]

  function openComposer() {
    if (!currentUser.id) {
      setLoginPrompt(true)
      return
    }
    setLoginPrompt(false)
    setComposerOpen(true)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="pb-1">
        <p className="esr-eyebrow">Good food, shared honestly</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Foodie Feed</h1>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.7fr)_minmax(220px,0.95fr)]">
        <aside aria-label="Recently viewed restaurants" className="order-2 space-y-4 lg:order-1">
          <section className="esr-card p-5">
            <h2 className="esr-serif text-xl font-bold">Recently viewed</h2>
            {recentDisplay.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Restaurants you open will appear here.</p>
            ) : (
              <>
                {recentlyViewed.length > 0 && <RestaurantList restaurants={recentlyViewed} />}
                {suggested.length > 0 && (
                  <>
                    <p className="mt-4 text-sm font-medium text-[var(--muted)]">Suggested for you</p>
                    <RestaurantList restaurants={suggested} />
                  </>
                )}
              </>
            )}
            <Link href="/user/offers" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--crimson)] hover:underline">
              Explore restaurants <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </aside>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          <section aria-labelledby="latest-feed-heading" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 id="latest-feed-heading" className="esr-eyebrow">Latest from the community</h2>
              <button
                type="button"
                onClick={openComposer}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--crimson)] hover:underline"
              >
                <PenLine aria-hidden="true" size={16} />
                Create a post
              </button>
            </div>
            {loginPrompt && (
              <p role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--plum)]">
                Sign in to share a post.{' '}
                <Link href="/auth/login?next=%2Fuser%2Ffoodies-feed" className="font-semibold text-[var(--crimson)] underline underline-offset-2">Login</Link>
                {' '}or{' '}
                <Link href="/auth/signup" className="font-semibold text-[var(--crimson)] underline underline-offset-2">sign up</Link>.
              </p>
            )}
            {posts.length === 0 && (
              <div className="esr-card p-8 text-center">
                <p className="font-bold text-[var(--plum)]">No posts yet</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Be the first to share a meal on ESR.</p>
                <button type="button" onClick={openComposer} className="esr-primary-button mt-4 min-h-11 px-5">
                  Create a post
                </button>
              </div>
            )}
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostChange={(next) => setPosts((prev) => prev.map((item) => item.id === next.id ? next : item))}
              />
            ))}
          </section>
        </div>

        <aside aria-label="Restaurant recommendations and discounts" className="order-3 space-y-4">
          <section className="esr-card p-5">
            <h2 className="esr-serif text-xl font-bold">For you</h2>
            {restaurants.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Restaurants will appear here soon.</p>
            ) : (
              <RestaurantList restaurants={restaurants.slice(0, 3)} />
            )}
            <Link href="/user/offers" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--crimson)] hover:underline">
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
                    <Link href={restaurantHref(discount.restaurantId)} className="flex min-h-12 items-center gap-3 rounded-lg text-sm text-[var(--plum)] hover:text-[var(--crimson)]">
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
            <Link href="/user/offers" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--crimson)] hover:underline">
              Browse discounts <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </aside>
      </div>

      {composerOpen && (
        <ReviewComposer
          restaurants={restaurants}
          currentUser={currentUser}
          onClose={() => setComposerOpen(false)}
          onPosted={(post) => {
            setPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)])
            setComposerOpen(false)
          }}
        />
      )}
    </div>
  )
}
