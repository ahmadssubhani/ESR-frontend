'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import type { FeedComment, FeedPost, FeedUser } from '@/components/user/feed/types'
import { DEFAULT_AVATAR } from '@/lib/foodie-feed'
import { createClient } from '@/lib/supabase/client'

interface Props {
  post: FeedPost
  currentUser: FeedUser
  onPostChange: (next: FeedPost) => void
}

type CommentRow = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
  profiles?: { full_name?: string | null; image_url?: string | null; avatar_url?: string | null } |
    { full_name?: string | null; image_url?: string | null; avatar_url?: string | null }[] | null
}

function mapComment(row: CommentRow): FeedComment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: profile?.full_name || 'ESR Foodie',
    userAvatar: profile?.avatar_url || profile?.image_url || DEFAULT_AVATAR,
    body: row.body,
    createdAt: row.created_at,
  }
}

function formatDate(iso?: string) {
  if (!iso) return 'Recently'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FeedPostCard({ post, currentUser, onPostChange }: Props) {
  const [openComments, setOpenComments] = useState(false)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [draft, setDraft] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [sending, setSending] = useState(false)
  const [liking, setLiking] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const signedIn = Boolean(currentUser.id)

  useEffect(() => {
    if (!openComments) return
    let active = true
    const supabase = createClient()
    void supabase
      .from('post_comments')
      .select('id, post_id, user_id, body, created_at, profiles!post_comments_user_id_fkey(full_name, image_url, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Could not load post comments:', error)
          setActionMessage('Comments could not be loaded right now.')
          setLoadingComments(false)
          return
        }
        setComments(((data || []) as unknown as CommentRow[]).map(mapComment))
        if (active) setLoadingComments(false)
      }, (error: unknown) => {
        if (!active) return
        console.error('Could not load post comments:', error)
        setActionMessage('Comments could not be loaded right now.')
        setLoadingComments(false)
      })
    return () => {
      active = false
    }
  }, [openComments, post.id])

  async function toggleLike() {
    if (!signedIn) {
      setLoginPrompt(true)
      setActionMessage('')
      return
    }
    if (liking) return
    setLiking(true)
    setLoginPrompt(false)
    setActionMessage('')
    const nextLiked = !post.likedByMe
    const optimistic = {
      ...post,
      likedByMe: nextLiked,
      likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)),
    }
    onPostChange(optimistic)
    try {
      const supabase = createClient()
      const result = nextLiked
        ? await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUser.id })
        : await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
      if (result.error) throw result.error
      setActionMessage(nextLiked ? 'Post liked.' : 'Like removed.')
    } catch (error) {
      onPostChange(post)
      const message = error instanceof Error ? error.message : 'Could not update your like.'
      setActionMessage(message)
      toast.error(message)
    } finally {
      setLiking(false)
    }
  }

  async function sendComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!signedIn) {
      setLoginPrompt(true)
      return
    }
    if (!body || sending) return
    setSending(true)
    setActionMessage('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: post.id, user_id: currentUser.id, body })
        .select('id, post_id, user_id, body, created_at, profiles!post_comments_user_id_fkey(full_name, image_url, avatar_url)')
        .single()
      if (error) throw error
      setComments((current) => [...current, mapComment(data as unknown as CommentRow)])
      setDraft('')
      onPostChange({ ...post, commentCount: post.commentCount + 1 })
      setActionMessage('Comment posted.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not post your comment.'
      setActionMessage(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <article id={`post-${post.id}`} className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <Image src={post.userAvatar || DEFAULT_AVATAR} alt="" fill sizes="40px" className="object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--plum)]">{post.userName}</p>
            <p className="truncate text-sm text-[var(--muted)]">{post.restaurantName} · {post.restaurantCity || 'Pakistan'}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p aria-label={`Rated ${post.rating.toFixed(1)} out of 5`} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-sm font-bold text-[var(--plum)]">
            <span aria-hidden="true" className="text-[var(--crimson)]">★</span> {post.rating.toFixed(1)}
          </p>
          <time className="block text-sm text-[var(--muted)]" dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
        </div>
      </div>

      {post.image && (
        <div className="relative aspect-[16/10] max-h-[28rem] overflow-hidden bg-[var(--surface-muted)]">
          <Image
            src={post.image}
            alt={`Meal shared at ${post.restaurantName}`}
            fill
            sizes="(max-width: 768px) 100vw, 680px"
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      <div className="space-y-3 p-4 pt-3">
        <p className="text-base leading-relaxed text-[var(--plum)]">{post.text}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-1">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <button
              type="button"
              onClick={() => void toggleLike()}
              aria-pressed={post.likedByMe}
              aria-label={`${post.likedByMe ? 'Unlike' : 'Like'} ${post.userName}'s post, ${post.likes} likes`}
              disabled={liking}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold ${
                post.likedByMe ? 'text-[var(--crimson)]' : 'hover:text-[var(--crimson)]'
              }`}
            >
              <Heart aria-hidden="true" size={18} fill={post.likedByMe ? 'currentColor' : 'none'} />
              {post.likes}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!openComments) setLoadingComments(true)
                setOpenComments((open) => !open)
                if (!signedIn) setLoginPrompt(true)
              }}
              aria-expanded={openComments}
              aria-controls={`post-comments-${post.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold hover:text-[var(--crimson)]"
            >
              <MessageCircle aria-hidden="true" size={18} />
              {post.commentCount > 0 ? post.commentCount : 'Comment'}
            </button>
          </div>
          {post.restaurantId && (
            <Link href={`/user/offers#restaurant/${encodeURIComponent(post.restaurantId)}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[var(--crimson)] hover:underline">
              Explore restaurant <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {loginPrompt && (
          <p role="status" className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--plum)]">
            Sign in to like or comment.{' '}
            <Link href="/auth/login?next=%2Fuser%2Ffoodies-feed" className="font-semibold text-[var(--crimson)] underline underline-offset-2">Login</Link>
            {' '}or{' '}
            <Link href="/auth/signup" className="font-semibold text-[var(--crimson)] underline underline-offset-2">sign up</Link>.
          </p>
        )}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{actionMessage}</p>

        {openComments && (
          <div id={`post-comments-${post.id}`} className="space-y-3 pt-1">
            {loadingComments && <p className="text-sm text-[var(--muted)]">Loading comments…</p>}
            {!loadingComments && comments.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Be the first to comment on this post.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <Image src={comment.userAvatar} alt="" fill sizes="32px" className="object-cover" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl bg-[var(--surface-muted)] px-3 py-2">
                  <p className="text-sm font-bold text-[var(--plum)]">{comment.userName}</p>
                  <p className="text-sm text-[var(--plum)]">{comment.body}</p>
                  <time className="text-xs text-[var(--muted)]" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                </div>
              </div>
            ))}
            {signedIn ? (
              <form onSubmit={sendComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-label={`Comment on ${post.userName}'s post`}
                  maxLength={1000}
                  placeholder="Write a comment…"
                  className="esr-auth-input min-h-11 min-w-0 flex-1 rounded-full px-4 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--crimson)] disabled:opacity-50"
                  aria-label="Send comment"
                >
                  <Send aria-hidden="true" size={18} />
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </article>
  )
}
