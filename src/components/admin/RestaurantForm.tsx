'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Restaurant, Category } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

const PRICE_LEVELS = ['LOW', 'MEDIUM', 'HIGH']
const RESTAURANT_TYPES = ['DINE IN ONLY','DINE IN & TAKE AWAY','DINE IN & DELIVERY','TAKE AWAY ONLY','TAKE AWAY & DELIVERY','DELIVERY ONLY','DINE IN & TAKE AWAY & DELIVERY']

export default function RestaurantForm({ restaurant, categories }: { restaurant: Restaurant | null; categories: Category[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    address: restaurant?.address || '',
    city: restaurant?.city || '',
    country: restaurant?.country || 'PK',
    phone_number: restaurant?.phone_number || '',
    email: restaurant?.email || '',
    website: restaurant?.website || '',
    opening_hours: restaurant?.opening_hours || '',
    price_level: restaurant?.price_level || 'MEDIUM',
    category_id: restaurant?.category_id || '',
    restaurant_type: restaurant?.restaurant_type || 'DINE IN & TAKE AWAY & DELIVERY',
    lat: restaurant?.lat?.toString() || '',
    lng: restaurant?.lng?.toString() || '',
    tags: restaurant?.tags?.join(', ') || '',
    is_featured: restaurant?.is_featured || false,
    is_active: restaurant?.is_active !== false,
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
    const toastId = toast.loading(restaurant ? 'Saving restaurant…' : 'Creating restaurant…')

    let image_url = restaurant?.image_url || null
    if (imageFile) {
      const supabase = createClient()
      const path = `restaurants/${Date.now()}-${imageFile.name}`
      const { data } = await supabase.storage.from('restaurant-images').upload(path, imageFile)
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(path)
        image_url = publicUrl
      }
    }

    const payload = {
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      image_url,
    }

    const res = await fetch(restaurant ? `/api/restaurants/${restaurant.id}` : '/api/restaurants', {
      method: restaurant ? 'PUT' : 'POST',
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
    toast.success(restaurant ? 'Restaurant updated' : 'Restaurant created', { id: toastId })
    router.push('/admin/restaurants')
    router.refresh()
  }

  async function handleDelete() {
    if (!restaurant || !confirm('Delete this restaurant? This cannot be undone.')) return
    const toastId = toast.loading('Deleting restaurant…')
    const res = await fetch(`/api/restaurants/${restaurant.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete restaurant', { id: toastId })
      return
    }
    toast.success('Restaurant deleted', { id: toastId })
    router.push('/admin/restaurants')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name *" value={form.name} onChange={v => set('name', v)} required />
        <Field label="City" value={form.city} onChange={v => set('city', v)} />
        <Field label="Phone" value={form.phone_number} onChange={v => set('phone_number', v)} />
        <Field label="Email" value={form.email} onChange={v => set('email', v)} type="email" />
        <Field label="Website" value={form.website} onChange={v => set('website', v)} type="url" />
        <Field label="Opening Hours" value={form.opening_hours} onChange={v => set('opening_hours', v)} placeholder="e.g. 10am – 11pm" />
        <Field label="Address" value={form.address} onChange={v => set('address', v)} />
        <Field label="Country" value={form.country} onChange={v => set('country', v)} />
        <Field label="Latitude" value={form.lat} onChange={v => set('lat', v)} placeholder="e.g. 31.5204" />
        <Field label="Longitude" value={form.lng} onChange={v => set('lng', v)} placeholder="e.g. 74.3587" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 resize-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(220, 38, 38)]">
            <option value="">Select…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price Level</label>
          <select value={form.price_level} onChange={e => set('price_level', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(220, 38, 38)]">
            {PRICE_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Type</label>
          <select value={form.restaurant_type} onChange={e => set('restaurant_type', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(220, 38, 38)]">
            {RESTAURANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <Field label="Tags (comma-separated)" value={form.tags} onChange={v => set('tags', v)} placeholder="biryani, BBQ, family-friendly" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Image</label>
        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        {restaurant?.image_url && !imageFile && (
          <img src={restaurant.image_url} alt="" className="w-20 h-20 rounded-xl object-cover mt-2" />
        )}
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="accent-[rgb(220, 38, 38)]" />
          <span className="text-sm font-medium text-gray-700">Featured Restaurant</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-[rgb(220, 38, 38)]" />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-[rgb(220, 38, 38)] text-white font-semibold py-3 rounded-xl hover:bg-[#C4341F] transition-colors disabled:opacity-60">
          {loading ? <ButtonLoader label="Saving…" /> : restaurant ? 'Save Changes' : 'Create Restaurant'}
        </button>
        {restaurant && (
          <button type="button" onClick={handleDelete}
            className="border-2 border-red-200 text-red-500 font-medium px-6 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(220, 38, 38)]" />
    </div>
  )
}
