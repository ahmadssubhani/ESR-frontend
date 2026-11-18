'use client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Star } from 'lucide-react'

interface Props {
  redemptionChart: { date: string; count: number }[]
  topOffers: { name: string; restaurant: string; count: number }[]
  topRestaurants: { name: string; avg_rating: number; reviews_count: number }[]
  totalRedemptions: number
  totalReviews: number
}

export default function AnalyticsClient({ redemptionChart, topOffers, topRestaurants, totalRedemptions, totalReviews }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Redemptions (30 days)</p>
          <p className="text-4xl font-black text-red-600 mt-1">{totalRedemptions}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Reviews (30 days)</p>
          <p className="text-4xl font-black text-blue-600 mt-1">{totalReviews}</p>
        </div>
      </div>

      {/* Redemptions Over Time */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-900 mb-4">Redemptions Over Time (30 days)</h2>
        {redemptionChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={redemptionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="rgb(220, 38, 38)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No redemptions in the last 30 days</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Offers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-gray-900 mb-4">Top Offers by Redemption</h2>
          {topOffers.length > 0 ? (
            <div className="space-y-3">
              {topOffers.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-200 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.name}</p>
                    <p className="text-xs text-gray-400">{o.restaurant}</p>
                  </div>
                  <span className="bg-red-100 text-red-600 text-xs font-black px-2 py-1 rounded-lg flex-shrink-0">{o.count}×</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Top Restaurants */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-gray-900 mb-4">Top Restaurants by Rating</h2>
          {topRestaurants.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topRestaurants} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v) => [`${v} / 5`, 'Avg Rating']} />
                <Bar dataKey="avg_rating" fill="rgb(220, 38, 38)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-300 text-sm">No ratings yet</div>
          )}
        </div>
      </div>
    </div>
  )
}


