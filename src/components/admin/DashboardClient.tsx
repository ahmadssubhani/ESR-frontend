'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Image as ImageIcon } from 'lucide-react'

interface KPIs { totalRestaurants: number; activeOffers: number; todayRedemptions: number; todayReviews: number }
interface DiscountRow { id: string; name: string; valid_from: string; valid_till: string; coupon_code: string; availed: number }
interface Tag { name: string; count: number }
export interface Review {
  id: string
  profiles?: { full_name: string | null } | null
  review_images?: { image_url: string }[]
  comment?: string | null
  rating_overall?: number
  rating_taste?: number
  rating_ambiance?: number
  rating_quality?: number
  rating_money_value?: number
  tags?: string[]
}

type DateRange = 'today' | '7days' | 'month' | 'all'

export default function DashboardClient({
  kpis, discountData, reviews, tags, isAdmin
}: {
  kpis: KPIs; discountData: DiscountRow[]; reviews: Review[]; tags: Tag[]; isAdmin: boolean
}) {
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10000)
    return () => clearInterval(timer)
  }, [router])

  const totalAvailed = discountData.reduce((sum, d) => sum + d.availed, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 bg-white">
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Restaurants', value: kpis.totalRestaurants, icon: '🍽️', color: 'from-red-50' },
          { label: 'Active Offers', value: kpis.activeOffers, icon: '🏷️', color: 'from-blue-50' },
          { label: 'Redemptions Today', value: kpis.todayRedemptions, icon: '🎟️', color: 'from-green-50' },
          { label: 'Reviews Today', value: kpis.todayReviews, icon: '⭐', color: 'from-purple-50' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} to-white rounded-2xl border border-gray-100 shadow-sm p-5`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-3xl font-black text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Total Availed */}
      <div className="bg-red-600 text-white rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-red-200 text-sm">Total Discounts Availed</p>
          <p className="text-4xl font-black mt-1">{totalAvailed}</p>
        </div>
        <div className="text-6xl opacity-30">🎟️</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discount Availed Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-900">Discount Availed by Offer</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Offer', 'Valid From', 'Valid Till', 'Coupon', 'Availed'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {discountData.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No data yet</td></tr>
                ) : discountData.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[150px] truncate">{row.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.valid_from}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.valid_till}</td>
                    <td className="px-4 py-3">
                      <span className="bg-red-100 text-red-600 text-xs font-mono font-bold px-2 py-1 rounded-lg">{row.coupon_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-1 rounded-lg">{row.availed}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-900">Tags</h2>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No tags yet</p>
            ) : tags.map(tag => (
              <div key={tag.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{tag.name}</span>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-lg">{tag.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Customer Reviews</h2>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No reviews yet</p>
          ) : reviews.map(r => {
            const profile = r.profiles as { full_name: string | null } | null
            const images = (r.review_images as { image_url: string }[]) || []
            return (
              <div key={r.id as string} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedReview(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {profile?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-700">{profile?.full_name || 'Customer'}</span>
                      {r.comment && <p className="text-xs text-gray-400 truncate">{r.comment as string}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {images.length > 0 && <ImageIcon size={14} className="text-gray-300" />}
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                      <Star size={12} className="text-[rgb(220, 38, 38)] fill-current" />
                      <span className="text-xs font-bold text-[rgb(220, 38, 38)]">{r.rating_overall as number}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedReview(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Review Detail</h3>
              <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{((selectedReview.profiles as { full_name: string | null })?.full_name) || 'Customer'}</span>
                <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                  <Star size={14} className="text-red-600 fill-current" />
                  <span className="font-bold text-red-600">{selectedReview.rating_overall as number}</span>
                </div>
              </div>
              {selectedReview.comment && <p className="text-gray-600 text-sm">{selectedReview.comment as string}</p>}
              <div className="grid grid-cols-2 gap-2">
                {(['taste', 'ambiance', 'quality', 'money_value'] as const).map(dim => (
                  <div key={dim} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 capitalize">{dim.replace('_', ' ')}</p>
                    <p className="font-bold text-gray-900">{selectedReview[`rating_${dim}`] as number}/5</p>
                  </div>
                ))}
              </div>
              {(selectedReview.tags as string[])?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(selectedReview.tags as string[]).map(t => (
                    <span key={t} className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-lg">{t}</span>
                  ))}
                </div>
              )}
              {((selectedReview.review_images as { image_url: string }[]) || []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {(selectedReview.review_images as { image_url: string }[]).map((img, i) => (
                    <img key={i} src={img.image_url} className="w-20 h-20 rounded-xl object-cover" alt="" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
