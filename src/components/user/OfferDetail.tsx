'use client'
import { useState } from 'react'
import { ArrowLeft, Star, MapPin, Clock, Heart, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import RedemptionFlow from './RedemptionFlow'

interface Props {
  offer: Record<string, unknown>
  restaurantTags: string[]
  isLoggedIn: boolean
}

export default function OfferDetail({ offer, restaurantTags, isLoggedIn }: Props) {
  const router = useRouter()
  const [showRedemption, setShowRedemption] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)

  const restaurant = offer.restaurants as Record<string, unknown>
  const reviews = (offer.reviews as Record<string, unknown>[]) || []
  const is_redeemable = offer.is_redeemable as boolean
  const already_claimed = Boolean(offer.already_claimed)
  const can_review = offer.can_review as boolean
  const avg_rating = offer.avg_rating as string | null
  const discountPct = (offer.original_price as number) > 0
    ? Math.ceil(100 - ((offer.discounted_price as number) / (offer.original_price as number)) * 100)
    : 0

  async function toggleWishlist() {
    if (!isLoggedIn) { router.push('/auth/login'); return }
    const offerId = offer.id as string
    if (inWishlist) {
      await fetch(`/api/wishlist/${offerId}`, { method: 'DELETE' })
      try {
        const raw = localStorage.getItem('esr_saved_offers')
        const ids = raw ? JSON.parse(raw) : []
        if (Array.isArray(ids)) {
          const next = ids.filter((id: string) => id !== offerId)
          localStorage.setItem('esr_saved_offers', JSON.stringify(next))
          window.dispatchEvent(new Event('esr-saved-updated'))
        }
      } catch {}
    } else {
      await fetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ offer_id: offerId }), headers: { 'Content-Type': 'application/json' } })
      try {
        const raw = localStorage.getItem('esr_saved_offers')
        const ids = raw ? JSON.parse(raw) : []
        const next = Array.isArray(ids) ? Array.from(new Set([...ids, offerId])) : [offerId]
        localStorage.setItem('esr_saved_offers', JSON.stringify(next))
        window.dispatchEvent(new Event('esr-saved-updated'))
      } catch {}
    }
    setInWishlist(!inWishlist)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Hero Image */}
      <div className="relative h-56 rounded-2xl overflow-hidden bg-gray-100 mb-6">
        {(offer.image_url || (restaurant?.cover_url as string)) ? (
          <img src={(offer.image_url || restaurant?.cover_url) as string} alt={offer.name as string} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
        {discountPct > 0 && (
          <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-sm px-3 py-1.5 rounded-xl">
            {discountPct}% OFF
          </div>
        )}
        <button onClick={toggleWishlist} className={`absolute top-3 left-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center ${inWishlist ? 'text-red-600' : 'text-gray-400'}`}>
          <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Offer Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-red-600 font-medium mb-1">{(restaurant?.categories as { name: string })?.name}</p>
            <h1 className="text-xl font-black text-gray-900">{offer.name as string}</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
              <MapPin size={14} /> {restaurant?.name as string} · {restaurant?.city as string}
            </p>
          </div>
          {avg_rating && (
            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
              <Star size={14} className="text-red-600 fill-current" />
              <span className="text-sm font-bold text-[rgb(220, 38, 38)]">{avg_rating}</span>
            </div>
          )}
        </div>

        <div className="flex items-end gap-3 mb-4">
          <span className="text-3xl font-black text-[rgb(220, 38, 38)]">Rs {offer.discounted_price as number}</span>
          {(offer.original_price as number) > 0 && (
            <span className="text-gray-400 line-through text-lg">Rs {offer.original_price as number}</span>
          )}
        </div>

        {(offer.description as string | null) && (
          <p className="text-gray-600 text-sm mb-4">{offer.description as string}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Clock size={13} />
          Valid: {new Date(offer.valid_from as string).toLocaleDateString()} – {new Date(offer.valid_till as string).toLocaleDateString()}
        </div>

        {restaurantTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {restaurantTags.map(tag => (
              <span key={tag} className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-lg">{tag}</span>
            ))}
          </div>
        )}

        {/* Redeem Button */}
        {!isLoggedIn ? (
          <button onClick={() => router.push('/auth/login')} className="w-full bg-[rgb(220, 38, 38)] text-white font-bold py-4 rounded-xl hover:bg-[#C4341F] transition-colors flex items-center justify-center gap-2">
            Sign in to Claim <ChevronRight size={18} />
          </button>
        ) : already_claimed ? (
          <button
            onClick={() => setShowRedemption(true)}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            Voucher claimed <ChevronRight size={18} />
          </button>
        ) : !is_redeemable ? (
          <div className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl text-center text-sm">
            {(offer.is_bumper as boolean) ? 'Bumper Activity — Not Redeemable' : 'Already redeemed today or limit reached'}
          </div>
        ) : (
          <button
            onClick={() => setShowRedemption(true)}
            className="w-full bg-[rgb(220, 38, 38)] text-white font-bold py-4 rounded-xl hover:bg-[#C4341F] transition-colors flex items-center justify-center gap-2"
          >
            Claim Voucher <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-gray-900 mb-4">Reviews ({reviews.length})</h2>
          <div className="space-y-4">
            {reviews.slice(0, 5).map((r) => {
              const profile = r.profiles as { full_name: string | null; image_url: string | null } | null
              const images = (r.review_images as { image_url: string }[]) || []
              return (
                <div key={r.id as string} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                        {profile?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{profile?.full_name || 'Customer'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={13} className="text-yellow-400 fill-current" />
                      <span className="text-xs font-bold text-gray-600">{r.rating_overall as number}</span>
                    </div>
                  </div>
                  {(r.comment as string | null) && <p className="text-sm text-gray-600 mb-2">{r.comment as string}</p>}
                  {images.length > 0 && (
                    <div className="flex gap-2">
                      {images.slice(0, 4).map((img, i) => (
                        <img key={i} src={img.image_url} className="w-14 h-14 rounded-lg object-cover" alt="" />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    {(['taste', 'ambiance', 'quality', 'money_value'] as const).map(dim => (
                      <span key={dim} className="text-xs text-gray-400">
                        {dim.replace('_', ' ')}: <strong className="text-gray-600">{r[`rating_${dim}`] as number}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Redemption Flow Modal */}
      {showRedemption && (
        <RedemptionFlow
          offer={offer}
          canReview={already_claimed ? false : can_review}
          onClose={() => setShowRedemption(false)}
        />
      )}
    </div>
  )
}
