'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Heart, MapPin, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import type { FeedComment, FeedPost, FeedUser } from '@/components/user/feed/types'
import { DEFAULT_AVATAR } from '@/lib/foodie-feed'

interface Props {
  post: FeedPost
  currentUser: FeedUser
  onPostChange: (next: FeedPost) => void
  demoMode?: boolean
}

function formatDate(iso?: string) {
  if (!iso) return 'Recently'
  try {
    return new Date(iso).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recently'
  }
}

function mapComment(row: Record<string, unknown>): FeedComment {
  const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as
    | { full_name?: string | null; image_url?: string | null }
    | null
  return {
    id: String(row.id),
    reviewId: String(row.review_id),
    userId: String(row.user_id),
    userName: profile?.full_name || 'Foodie',
    userAvatar: profile?.image_url || DEFAULT_AVATAR,
    body: String(row.body || ''),
    createdAt: String(row.created_at || ''),
  }
}

export default function FeedPostCard({ post, currentUser, onPostChange, demoMode = false }: Props) {
  const [openComments, setOpenComments] = useState(false)
  const [comments, setComments] = useState<FeedComment[]>(() => {
    if (!demoMode || !post.commentCount) return []
    return [{
      id: `demo-sample-comment-${post.id}`,
      reviewId: post.id,
      userId: 'demo-commenter',
      userName: 'Sara Ali',
      userAvatar: DEFAULT_AVATAR,
      body: 'This looks delicious! Adding it to my weekend list.',
      createdAt: new Date().toISOString(),
    }]
  })
  const [draft, setDraft] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [sending, setSending] = useState(false)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    if (!openComments || demoMode) return
    let cancelled = false
    setLoadingComments(true)
    fetch(`/api/reviews/${post.id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) setComments(data.map(mapComment))
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false)
      })
    return () => {
      cancelled = true
    }
  }, [openComments, post.id, demoMode])

  async function toggleLike() {
    if (liking) return
    const nextLiked = !post.likedByMe
    const optimistic = {
      ...post,
      likedByMe: nextLiked,
      likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
    }
    onPostChange(optimistic)
    if (demoMode) {
      return
    }
    setLiking(true)
    try {
      const res = await fetch(`/api/reviews/${post.id}/like`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not like')
      onPostChange({
        ...optimistic,
        likedByMe: Boolean(data.liked),
      })
    } catch (err) {
      onPostChange(post)
      toast.error(err instanceof Error ? err.message : 'Could not like this review')
    } finally {
      setLiking(false)
    }
  }

  async function sendComment() {
    const body = draft.trim()
    if (!body) return
    if (demoMode) {
      const comment: FeedComment = {
        id: `demo-comment-${Date.now()}`,
        reviewId: post.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        body,
        createdAt: new Date().toISOString(),
      }
      setComments((prev) => [...prev, comment])
      setDraft('')
      onPostChange({ ...post, commentCount: post.commentCount + 1 })
      toast.success('Comment added')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/reviews/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not comment')
      const comment = mapComment(data)
      setComments((prev) => [...prev, comment])
      setDraft('')
      onPostChange({ ...post, commentCount: post.commentCount + 1 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setSending(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-base font-semibold text-[var(--crimson)]">
            {post.userName.trim().charAt(0).toUpperCase() || 'F'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-base font-bold text-[var(--plum)]">{post.userName}</p>
              {post.verified && (
                <BadgeCheck size={14} className="shrink-0 text-[var(--crimson)]" aria-label="Verified review" />
              )}
            </div>
            <p className="flex items-center gap-1 truncate text-sm text-[var(--muted)]">
              <MapPin size={11} className="shrink-0" />
              {post.restaurantName}
              {post.offerName ? ` · ${post.offerName}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {!post.image && (
            <span role="img" aria-label={`Rated ${post.rating.toFixed(1)} out of 5`} className="text-sm font-bold text-[var(--plum)]">
              <span aria-hidden="true" className="text-[var(--crimson)]">★ </span>{post.rating.toFixed(1)}
            </span>
          )}
          <p className="text-sm text-[var(--muted)]">{formatDate(post.createdAt)}</p>
        </div>
      </div>

      {post.image && (
        <div className="relative aspect-[16/10] max-h-[28rem] overflow-hidden bg-[var(--surface-muted)]">
          <Image
            src={post.image}
            alt={`Meal shared at ${post.restaurantName}`}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="h-full w-full object-cover"
          />
          <span
            role="img"
            aria-label={`Rated ${post.rating.toFixed(1)} out of 5`}
            className="absolute right-3 top-3 inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-bold text-[var(--plum)] shadow-md"
          >
            <span aria-hidden="true" className="text-[var(--crimson)]">★</span>
            <span aria-hidden="true">{post.rating.toFixed(1)}</span>
          </span>
        </div>
      )}

      <div className="space-y-3 p-4 pt-3">
        <p className="text-base leading-relaxed text-[var(--foreground)]">{post.text}</p>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-1">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={post.likedByMe}
              aria-label={`${post.likedByMe ? 'Unlike' : 'Like'} ${post.userName}'s review, ${post.likes} likes`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold ${
                post.likedByMe ? 'text-[var(--crimson)]' : 'hover:text-[var(--crimson)]'
              }`}
            >
              <Heart aria-hidden="true" size={18} fill={post.likedByMe ? 'currentColor' : 'none'} />
              {post.likes}
            </button>
            <button
              type="button"
              onClick={() => setOpenComments((open) => !open)}
              aria-expanded={openComments}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold hover:text-[var(--crimson)]"
            >
              <MessageCircle aria-hidden="true" size={18} />
              {post.commentCount > 0 ? post.commentCount : 'Comment'}
            </button>
          </div>
          <Link href="/user/offers" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[var(--crimson)] hover:underline">
            Browse offers <span aria-hidden="true">→</span>
          </Link>
        </div>

        {openComments && (
          <div className="space-y-3 pt-1">
            {loadingComments && <p className="text-xs text-gray-400">Loading comments…</p>}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs text-gray-400">Be the first to comment on this review.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-red-50 shrink-0">
                  <Image src={comment.userAvatar} alt={comment.userName} fill className="object-cover" />
                </div>
                <div className="bg-gray-50 rounded-2xl px-3 py-2 min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-gray-800">{comment.userName}</p>
                  <p className="text-xs text-gray-700">{comment.body}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-red-50 shrink-0">
                <Image src={currentUser.avatar} alt="You" fill className="object-cover" />
              </div>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={`Comment on ${post.userName}'s review`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendComment()
                  }
                }}
                placeholder="Write a comment…"
                className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => void sendComment()}
                disabled={sending || !draft.trim()}
                className="text-red-600 disabled:text-gray-300"
                aria-label="Send comment"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
