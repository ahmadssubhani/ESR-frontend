'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Offer } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

interface Restaurant { id: string; name: string }

export default function OfferForm({ offer, restaurants, isAdmin }: { offer: Offer | null; restaurants: Restaurant[]; isAdmin: boolean }) {
  const router = useRouter()
  const toLocal = (d: string | null) => d ? new Date(d).toISOString().slice(0, 16) : ''

  const [form, setForm] = useState({
    restaurant_id: offer?.restaurant_id || (restaurants[0]?.id || ''),
    name: offer?.name || '',
    description: offer?.description || '',
    original_price: offer?.original_price?.toString() || '',
    discounted_price: offer?.discounted_price?.toString() || '',
    valid_from: toLocal(offer?.valid_from || null),
    valid_till: toLocal(offer?.valid_till || null),
    approval_status: offer?.approval_status || false,
    is_bumper: offer?.is_bumper || false,
    is_redeemable: offer?.is_redeemable !== false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const toastId = toast.loading(offer ? 'Saving offer…' : 'Creating offer…')

    let image_url = offer?.image_url || null
    if (imageFile) {
      const supabase = createClient()
      const path = `offers/${Date.now()}-${imageFile.name}`
      const { data } = await supabase.storage.from('restaurant-images').upload(path, imageFile)
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(path)
        image_url = publicUrl
      }
    }

    const payload = {
      ...form,
      original_price: parseFloat(form.original_price) || 0,
      discounted_price: parseFloat(form.discounted_price) || 0,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_till: form.valid_till ? new Date(form.valid_till).toISOString() : null,
      image_url,
    }

    const res = await fetch(offer ? `/api/offers/${offer.id}` : '/api/offers', {
      method: offer ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to save')
      toast.error(data.error || 'Failed to save', { id: toastId })
      setLoading(false)
      return
    }

    // Auto-create coupon for new approved offers
    if (!offer && data.id) {
      await fetch(`/api/coupons/${data.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
    }

    toast.success(offer ? 'Offer updated' : 'Offer created', { id: toastId })
    router.push('/admin/offers')
    router.refresh()
  }

  async function handleDelete() {
    if (!offer || !confirm('Delete this offer?')) return
    const toastId = toast.loading('Deleting offer…')
    const res = await fetch(`/api/offers/${offer.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete offer', { id: toastId })
      return
    }
    toast.success('Offer deleted', { id: toastId })
    router.push('/admin/offers')
    router.refresh()
  }

  const discountPct = form.original_price && form.discounted_price
    ? Math.ceil(100 - (parseFloat(form.discounted_price) / parseFloat(form.original_price)) * 100)
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant *</label>
        <select value={form.restaurant_id} onChange={e => set('restaurant_id', e.target.value)} required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Offer Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (Rs)</label>
          <input type="number" min="0" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discounted Price (Rs) {discountPct > 0 && <span className="text-red-600 font-bold">— {discountPct}% OFF</span>}
          </label>
          <input type="number" min="0" step="0.01" value={form.discounted_price} onChange={e => set('discounted_price', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
          <input type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valid Till *</label>
          <input type="datetime-local" value={form.valid_till} onChange={e => set('valid_till', e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Offer Image</label>
        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        {offer?.image_url && !imageFile && <img src={offer.image_url} alt="" className="w-20 h-20 rounded-xl object-cover mt-2" />}
      </div>

      <div className="flex gap-6 flex-wrap">
        {isAdmin && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.approval_status} onChange={e => set('approval_status', e.target.checked)} className="accent-[var(--crimson)]" />
            <span className="text-sm font-medium text-gray-700">Approved</span>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_bumper} onChange={e => set('is_bumper', e.target.checked)} className="accent-[var(--crimson)]" />
          <span className="text-sm font-medium text-gray-700">Bumper Activity</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_redeemable} onChange={e => set('is_redeemable', e.target.checked)} className="accent-[var(--crimson)]" />
          <span className="text-sm font-medium text-gray-700">Redeemable</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="esr-primary-button flex-1 py-3 transition-colors disabled:opacity-60">
          {loading ? <ButtonLoader label="Saving…" /> : offer ? 'Save Changes' : 'Create Offer'}
        </button>
        {offer && (
          <button type="button" onClick={handleDelete}
            className="border-2 border-red-200 text-red-500 font-medium px-6 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
