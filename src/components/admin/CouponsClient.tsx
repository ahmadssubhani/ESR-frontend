'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CouponsClient({ coupons }: { coupons: Record<string, unknown>[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Code', 'Offer', 'Restaurant', 'Times Used', 'Active', 'Copy'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {coupons.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No coupons yet. Create an offer to generate coupons.</td></tr>
            ) : coupons.map(c => {
              const offer = c.offers as { name: string; restaurants: { name: string } | null } | null
              const timesUsed = (c.user_coupons as unknown[])?.length || 0
              const code = c.code as string
              return (
                <tr key={c.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-lg font-black text-gray-900 tracking-widest">{code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">{offer?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{offer?.restaurants?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">{timesUsed}×</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => copy(code)}
                      className={`flex items-center gap-1 text-xs transition-colors ${copied === code ? 'text-green-500' : 'text-gray-400 hover:text-red-600'}`}>
                      {copied === code ? <Check size={13} /> : <Copy size={13} />}
                      {copied === code ? 'Copied!' : 'Copy'}
                    </button>
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
