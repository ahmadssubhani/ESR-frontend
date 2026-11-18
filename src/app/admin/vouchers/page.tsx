import { createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import LiveRefresh from '@/components/admin/LiveRefresh'
import { generateEsrVoucherCode } from '@/lib/esr-voucher-code'

type VoucherRow = {
  id: string
  used_at: string
  offer_id: string
  profiles: { full_name: string | null; email: string | null } | null
  coupons: { code: string | null } | null
  offers: { name: string; discounted_price: number; restaurants: { name: string } | null } | null
}

export const dynamic = 'force-dynamic'

export default async function AdminVouchersPage() {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('user_coupons')
    .select(
      'id, used_at, offer_id, profiles(full_name, email), coupons(code), offers(name, discounted_price, restaurants(name))'
    )
    .order('used_at', { ascending: false })
    .limit(300)

  const vouchers = (data || []) as unknown as VoucherRow[]

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Claimed Vouchers</h1>
      <LiveRefresh />
      <p className="text-sm text-gray-500 mb-6">Redemptions from the website. Codes are ESR- plus 5 digits and refresh every 30 minutes.</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Restaurant</th>
                <th className="text-left px-4 py-3">Offer</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Claimed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No vouchers claimed yet.
                  </td>
                </tr>
              ) : (
                vouchers.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{row.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.offers?.restaurants?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.offers?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      Rs. {row.offers?.discounted_price ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                        {generateEsrVoucherCode(row.offer_id) || row.coupons?.code || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.used_at ? format(new Date(row.used_at), 'MMM d, yyyy HH:mm') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
