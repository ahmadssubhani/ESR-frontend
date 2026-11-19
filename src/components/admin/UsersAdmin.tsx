'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ROLES = ['user', 'restaurant', 'admin']

export default function UsersAdmin({ users, restaurants }: { users: Record<string, unknown>[]; restaurants: { id: string; name: string }[] }) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function updateRole(userId: string, role: string, restaurantId?: string) {
    setUpdating(userId)
    const toastId = toast.loading('Updating role…')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role, restaurant_id: restaurantId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to update role', { id: toastId })
      } else {
        toast.success(`Role updated to ${role}`, { id: toastId })
      }
    } catch {
      toast.error('Failed to update role', { id: toastId })
    } finally {
      setUpdating(null)
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['User', 'Email', 'Role', 'Restaurant', 'Joined', 'Change Role'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No users yet.</td></tr>
            ) : users.map(u => {
              const restaurant = (u.restaurants as { id: string; name: string }[] | null)?.[0]
              return (
                <tr key={u.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(u.full_name as string)?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{(u.full_name as string) || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email as string}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg capitalize ${
                      u.role === 'admin' ? 'bg-red-100 text-red-600' :
                      u.role === 'restaurant' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{u.role as string}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{restaurant?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at as string).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={u.role as string}
                      onChange={e => updateRole(u.id as string, e.target.value)}
                      disabled={updating === (u.id as string)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-600 disabled:opacity-50"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
