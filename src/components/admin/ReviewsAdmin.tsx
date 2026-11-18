'use client'
import { useState } from 'react'
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ReviewsAdmin({ reviews: init, isAdmin }: { reviews: Record<string, unknown>[]; isAdmin: boolean }) {
  const [reviews, setReviews] = useState(init)
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  async function toggleActive(id: string, current: boolean) {
    const toastId = toast.loading(current ? 'Hiding review…' : 'Publishing review…')
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (!res.ok) {
      toast.error('Failed to update review', { id: toastId })
      return
    }
    setReviews(reviews.map(r => r.id === id ? { ...r, is_active: !current } : r))
    toast.success(current ? 'Review hidden' : 'Review published', { id: toastId })
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review?')) return
    const toastId = toast.loading('Deleting review…')
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete review', { id: toastId })
      return
    }
    setReviews(reviews.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Review deleted', { id: toastId })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {reviews.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">No reviews yet.</p>
          ) : reviews.map(r => {
            const profile = r.profiles as { full_name: string | null } | null
            const images = (r.review_images as { image_url: string }[]) || []
            const active = r.is_active as boolean
            return (
              <div key={r.id as string}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === r.id ? 'bg-red-50' : ''} ${!active ? 'opacity-50' : ''}`}
                onClick={() => setSelected(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700">{profile?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-400">{(r.restaurants as { name: string })?.name} · {(r.offers as { name: string })?.name}</p>
                    {(r.comment as string | null) && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.comment as string}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg">
                      <Star size={11} className="text-red-600 fill-current" />
                      <span className="text-xs font-bold text-red-600">{r.rating_overall as number}</span>
                    </div>
                    {images.length > 0 && <span className="text-xs text-gray-300">📷 {images.length}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">Review Detail</h3>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(selected.id as string, selected.is_active as boolean)}
                className={`flex items-center gap-1 text-xs px-3 py-2 rounded-xl border transition-colors ${
                  selected.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'
                }`}>
                {selected.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                {selected.is_active ? 'Hide' : 'Show'}
              </button>
              {isAdmin && (
                <button onClick={() => deleteReview(selected.id as string)}
                  className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">{((selected.profiles as { full_name: string | null })?.full_name) || 'Customer'}</p>
            <p className="text-xs text-gray-400">{(selected.restaurants as { name: string })?.name} · {(selected.offers as { name: string })?.name}</p>
          </div>

          {(selected.comment as string | null) && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4">{selected.comment as string}</p>}

          <div className="grid grid-cols-2 gap-2">
            {(['taste', 'ambiance', 'quality', 'money_value'] as const).map(dim => (
              <div key={dim} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 capitalize">{dim.replace('_', ' ')}</p>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={`${i < (selected[`rating_${dim}`] as number) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                  ))}
                  <span className="text-xs font-bold ml-1">{selected[`rating_${dim}`] as number}</span>
                </div>
              </div>
            ))}
          </div>

          {(selected.tags as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(selected.tags as string[]).map(t => (
                <span key={t} className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-lg">{t}</span>
              ))}
            </div>
          )}

          {((selected.review_images as { image_url: string }[]) || []).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(selected.review_images as { image_url: string }[]).map((img, i) => (
                <img key={i} src={img.image_url} className="w-20 h-20 rounded-xl object-cover" alt="" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 min-h-[300px]">
          <p className="text-sm">Select a review to see details</p>
        </div>
      )}
    </div>
  )
}
