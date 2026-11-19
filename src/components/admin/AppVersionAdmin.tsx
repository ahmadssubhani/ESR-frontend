'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

export default function AppVersionAdmin({ versions }: { versions: Record<string, unknown>[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ version: '', is_update_version: true, link_to_latest_version: '' })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const toastId = toast.loading('Saving version…')
    try {
      const res = await fetch('/api/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, version: parseFloat(form.version) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save version', { id: toastId })
      } else {
        toast.success('App version added', { id: toastId })
        setShowForm(false)
        setForm({ version: '', is_update_version: true, link_to_latest_version: '' })
      }
    } catch {
      toast.error('Failed to save version', { id: toastId })
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm">
        <Plus size={16} /> Add Version
      </button>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version Number</label>
            <input type="number" step="0.1" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600" placeholder="e.g. 1.2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Link</label>
            <input type="url" value={form.link_to_latest_version} onChange={e => setForm(f => ({ ...f, link_to_latest_version: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)]" placeholder="https://play.google.com/…" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_update_version} onChange={e => setForm(f => ({ ...f, is_update_version: e.target.checked }))} className="accent-[var(--crimson)]" />
            <span className="text-sm font-medium text-gray-700">Force Update</span>
          </label>
          <button type="submit" disabled={loading} className="esr-primary-button w-full py-3 transition-colors disabled:opacity-60">
            {loading ? <ButtonLoader label="Saving…" /> : 'Add Version'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Version', 'Force Update', 'Store Link', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {versions.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">No versions added yet.</td></tr>
            ) : versions.map(v => (
              <tr key={v.id as string} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono font-black text-gray-900 text-lg">v{v.version as number}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${v.is_update_version ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    {v.is_update_version ? '⚠️ Force Update' : 'Optional'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-blue-500 truncate max-w-[200px]">
                  {v.link_to_latest_version ? (
                    <a href={v.link_to_latest_version as string} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block">
                      {v.link_to_latest_version as string}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(v.created_at as string).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
