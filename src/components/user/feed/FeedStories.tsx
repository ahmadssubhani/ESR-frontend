'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Plus, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { mapDbStory } from '@/lib/foodie-feed'
import type { FeedStory, FeedUser, StoryGroup } from '@/components/user/feed/types'

const IMAGE_DURATION_MS = 5000

interface Props {
  groups: StoryGroup[]
  currentUser: FeedUser
  onStoryPosted: (story: FeedStory) => void
  demoMode?: boolean
}

export default function FeedStories({ groups, currentUser, onStoryPosted, demoMode = false }: Props) {
  const [viewer, setViewer] = useState<{ groupIndex: number; itemIndex: number } | null>(null)
  const [adding, setAdding] = useState(false)

  const activeGroup = viewer ? groups[viewer.groupIndex] : null
  const activeStory = activeGroup?.items[viewer?.itemIndex ?? 0]

  return (
    <>
      <section className="bg-white rounded-3xl border border-red-100 shadow-sm p-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">
          Stories &amp; Reels
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="relative w-[60px] h-[60px] rounded-full bg-red-50 border-2 border-dashed border-red-300 flex items-center justify-center">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-red-100">
                <Image src={currentUser.avatar} alt="You" fill className="object-cover" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-white">
                <Plus size={12} />
              </span>
            </div>
            <span className="text-[10px] font-bold text-gray-700">Your story</span>
          </button>

          {groups.map((group, groupIndex) => (
            <button
              key={group.userId}
              type="button"
              onClick={() => setViewer({ groupIndex, itemIndex: 0 })}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div
                className={`p-0.5 rounded-full ${
                  group.hasNew
                    ? 'bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400'
                    : 'bg-gray-200'
                }`}
              >
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-red-50">
                  <Image
                    src={group.avatar}
                    alt={group.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-700 max-w-[4.5rem] truncate">
                {group.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
        {groups.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            No live stories yet. Post a photo, or share a public Instagram Reel / Facebook video.
          </p>
        )}
      </section>

      {adding && (
        <AddStoryModal
          currentUser={currentUser}
          demoMode={demoMode}
          onClose={() => setAdding(false)}
          onPosted={(story) => {
            onStoryPosted(story)
            setAdding(false)
          }}
        />
      )}

      {viewer && activeGroup && activeStory && (
        <StoryViewer
          group={activeGroup}
          itemIndex={viewer.itemIndex}
          onClose={() => setViewer(null)}
          onChangeItem={(itemIndex) => setViewer({ ...viewer, itemIndex })}
          onNextGroup={() => {
            const next = viewer.groupIndex + 1
            if (next < groups.length) setViewer({ groupIndex: next, itemIndex: 0 })
            else setViewer(null)
          }}
          onPrevGroup={() => {
            const prev = viewer.groupIndex - 1
            if (prev >= 0) {
              const prevGroup = groups[prev]
              setViewer({ groupIndex: prev, itemIndex: prevGroup.items.length - 1 })
            } else setViewer(null)
          }}
        />
      )}
    </>
  )
}

function StoryViewer({
  group,
  itemIndex,
  onClose,
  onChangeItem,
  onNextGroup,
  onPrevGroup,
}: {
  group: StoryGroup
  itemIndex: number
  onClose: () => void
  onChangeItem: (index: number) => void
  onNextGroup: () => void
  onPrevGroup: () => void
}) {
  const story = group.items[itemIndex]
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  function goNext() {
    if (itemIndex < group.items.length - 1) onChangeItem(itemIndex + 1)
    else onNextGroup()
  }

  function goPrev() {
    if (itemIndex > 0) onChangeItem(itemIndex - 1)
    else onPrevGroup()
  }

  useEffect(() => {
    setProgress(0)
    if (story.mediaType === 'embed') return

    if (story.mediaType === 'video') {
      const video = videoRef.current
      if (!video) return
      const onTime = () => {
        if (video.duration) setProgress((video.currentTime / video.duration) * 100)
      }
      video.addEventListener('timeupdate', onTime)
      video.addEventListener('ended', goNext)
      return () => {
        video.removeEventListener('timeupdate', onTime)
        video.removeEventListener('ended', goNext)
      }
    }

    const started = Date.now()
    const timer = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / IMAGE_DURATION_MS) * 100)
      setProgress(pct)
      if (pct >= 100) {
        window.clearInterval(timer)
        goNext()
      }
    }, 50)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, itemIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, group])

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
        aria-label="Close story"
      >
        <X size={24} />
      </button>

      <div className="relative w-full max-w-md h-[min(92vh,760px)] bg-black rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
          {group.items.map((item, i) => (
            <div key={item.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: i < itemIndex ? '100%' : i === itemIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-7 left-3 right-12 z-10 flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-700">
            <Image src={group.avatar} alt={group.name} fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{group.name}</p>
            <p className="text-white/70 text-[10px] uppercase tracking-wide">
              {story.source === 'esr' ? 'ESR story' : story.source}
            </p>
          </div>
        </div>

        {story.mediaType === 'embed' && story.embedUrl ? (
          <iframe
            src={story.embedUrl}
            title={story.caption || 'Social reel'}
            className="absolute inset-0 w-full h-full bg-black"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : story.mediaType === 'video' && story.mediaUrl ? (
          <video
            ref={videoRef}
            src={story.mediaUrl}
            className="absolute inset-0 w-full h-full object-contain"
            autoPlay
            playsInline
          />
        ) : story.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.mediaUrl} alt={story.caption || group.name} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Story unavailable
          </div>
        )}

        {story.caption && (
          <p className="absolute bottom-6 left-4 right-4 text-white text-sm font-medium drop-shadow">
            {story.caption}
          </p>
        )}

        <button type="button" className="absolute inset-y-0 left-0 w-12 z-[1]" aria-label="Previous" onClick={goPrev} />
        <button type="button" className="absolute inset-y-0 right-0 w-12 z-[1]" aria-label="Next" onClick={goNext} />
      </div>
    </div>
  )
}

function AddStoryModal({
  currentUser,
  onClose,
  onPosted,
  demoMode,
}: {
  currentUser: FeedUser
  onClose: () => void
  onPosted: (story: FeedStory) => void
  demoMode: boolean
}) {
  const [tab, setTab] = useState<'upload' | 'social'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [socialUrl, setSocialUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (preview && !demoMode) URL.revokeObjectURL(preview)
    }
  }, [preview, demoMode])

  function onFile(next: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(next ? URL.createObjectURL(next) : null)
  }

  async function submit() {
    setLoading(true)
    try {
      if (demoMode) {
        if (tab === 'upload' && !preview) {
          toast.error('Choose a photo or short video first.')
          return
        }
        if (tab === 'social' && !socialUrl.trim()) {
          toast.error('Paste a public reel or video link first.')
          return
        }
        const story: FeedStory = {
          id: `demo-story-${Date.now()}`,
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          hasNew: true,
          mediaUrl: tab === 'upload' ? preview || undefined : undefined,
          mediaType: tab === 'upload' ? (file?.type.startsWith('video') ? 'video' : 'image') : 'embed',
          caption: caption.trim() || undefined,
          source: 'esr',
          externalUrl: tab === 'social' ? socialUrl : undefined,
          embedUrl: tab === 'social' ? socialUrl : undefined,
          createdAt: new Date().toISOString(),
        }
        onPosted(story)
        toast.success('Demo story added')
        return
      }

      if (tab === 'social') {
        const res = await fetch('/api/feed/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ social_url: socialUrl, caption }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not share reel')
        onPosted(mapDbStory(data))
        toast.success('Reel shared to Foodie Feed')
        return
      }

      if (!file) {
        toast.error('Choose a photo or short video first.')
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Keep stories under 20MB.')
        return
      }

      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${currentUser.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('feed-stories').upload(path, file)
      if (uploadError) throw new Error(uploadError.message)
      const {
        data: { publicUrl },
      } = supabase.storage.from('feed-stories').getPublicUrl(path)

      const res = await fetch('/api/feed/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_url: publicUrl,
          media_type: file.type.startsWith('video') ? 'video' : 'image',
          caption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not post story')
      onPosted(mapDbStory(data))
      toast.success('Story posted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post story')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900">Add story</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`text-xs font-bold py-2 rounded-full ${
              tab === 'upload' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Photo / video
          </button>
          <button
            type="button"
            onClick={() => setTab('social')}
            className={`text-xs font-bold py-2 rounded-full inline-flex items-center justify-center gap-1 ${
              tab === 'social' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Video size={12} />
            Instagram / FB
          </button>
        </div>

        {tab === 'upload' ? (
          <label className="block border-2 border-dashed border-red-200 rounded-2xl p-4 text-center cursor-pointer hover:bg-red-50">
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
            {preview ? (
              file?.type.startsWith('video') ? (
                <video src={preview} className="mx-auto max-h-48 rounded-xl" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-xl object-cover" />
              )
            ) : (
              <p className="text-sm text-gray-500 font-medium">Tap to upload a photo or short reel</p>
            )}
          </label>
        ) : (
          <div className="space-y-2">
            <input
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="Paste a public Instagram Reel or Facebook video URL"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <p className="text-[11px] text-gray-400">
              Meta does not allow importing private Stories. Public Reels, posts, and Facebook videos can be
              embedded.
            </p>
          </div>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Add a caption (optional)"
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-full disabled:opacity-60"
        >
          {loading ? 'Posting…' : 'Share to stories'}
        </button>
      </div>
    </div>
  )
}
