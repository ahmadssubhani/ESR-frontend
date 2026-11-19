'use client'
import { useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

export type Ad = {
  id: string
  title: string
  category: string
  expiry?: string | null
  deeplink?: string
  is_active?: boolean
  image_url?: string | null
}

type AdForm = {
  title: string
  category: string
  expiry: string
  deeplink: string
  is_active: boolean
}

const CATEGORIES = [{ value: 'S', label: 'Silver (3s rotation)' }, { value: 'G', label: 'Gold (15s rotation)' }, { value: 'D', label: 'Diamond (20s rotation)' }]

const EMPTY: AdForm = { title: '', category: 'S', expiry: '', deeplink: '', is_active: false }

export default function AdsAdmin({ ads: init }: { ads: Ad[] }) {
  const router = useRouter()
  const [ads, setAds] = useState<Ad[]>(init)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Ad | null>(null)
  const [form, setForm] = useState<AdForm>({ ...EMPTY })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  function openNew() { setEditing(null); setForm({ ...EMPTY }); setImageFile(null); setShowForm(true) }
  function openEdit(ad: Ad) {
    setEditing(ad)
    setForm({
      title: ad.title,
      category: ad.category,
      expiry: ad.expiry ? new Date(ad.expiry).toISOString().slice(0, 16) : '',
      deeplink: ad.deeplink || '',
      is_active: !!ad.is_active,
    })
    setImageFile(null)
    setShowForm(true)
  }

  async function save() {
    setLoading(true)
    const toastId = toast.loading(editing ? 'Updating ad…' : 'Creating ad…')
    let image_url = editing?.image_url || null
    if (imageFile) {
      const supabase = createClient()
      const path = `ads/${Date.now()}-${imageFile.name}`
      const { data } = await supabase.storage.from('ads').upload(path, imageFile)
      if (data) image_url = supabase.storage.from('ads').getPublicUrl(path).data.publicUrl
    }

    const body = { ...form, expiry: form.expiry ? new Date(form.expiry as string).toISOString() : null, image_url, ...(editing ? { id: editing.id } : {}) }
    const res = await fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setAds(editing ? ads.map(a => a.id === editing.id ? { ...a, ...data } : a) : [data, ...ads])
      setShowForm(false)
      toast.success(editing ? 'Ad updated' : 'Ad created', { id: toastId })
    } else {
      toast.error(data.error || 'Failed to save ad', { id: toastId })
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <button onClick={openNew} className="flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
        <Plus size={16} /> Add Ad
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map(ad => (
          <div key={ad.id as string} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-red-100 to-red-200 relative">
              {ad.image_url && <img src={ad.image_url as string} alt="" className="w-full h-full object-cover" />}
              <div className="absolute top-2 right-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${ad.is_active ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {ad.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{ad.title as string}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CATEGORIES.find(c => c.value === ad.category)?.label}
                  </p>
                  {ad.expiry && <p className="text-xs text-gray-400 mt-0.5">Expires: {new Date(ad.expiry as string).toLocaleDateString()}</p>}
                </div>
                <button onClick={() => openEdit(ad)} className="text-gray-400 hover:text-red-600 transition-colors">
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">{editing ? 'Edit Ad' : 'New Ad'}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={form.title as string} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category as string} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                <input type="datetime-local" value={form.expiry as string} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deeplink URL</label>
                <input type="url" value={form.deeplink as string} onChange={e => setForm(f => ({ ...f, deeplink: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active as boolean} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-[var(--crimson)]" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <button onClick={save} disabled={loading}
                className="esr-primary-button w-full py-3 transition-colors disabled:opacity-60">
                {loading ? <ButtonLoader label="Saving…" /> : 'Save Ad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
