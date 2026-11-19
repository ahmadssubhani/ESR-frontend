'use client'
import { useState } from 'react'
import { ArrowLeft, Star, MapPin, Clock, Heart, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import RedemptionFlow from './RedemptionFlow'
import { toggleSaveOffer } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  offer: Record<string, unknown>
  restaurantTags: string[]
  userId: string | null
  isSaved: boolean
}

export default function OfferDetail({ offer, restaurantTags, userId, isSaved }: Props) {
  const router = useRouter()
  const [showRedemption, setShowRedemption] = useState(false)
  const [inWishlist, setInWishlist] = useState(isSaved)
  const [wishlistBusy, setWishlistBusy] = useState(false)

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
    if (!userId) { router.push('/auth/login'); return }
    const offerId = offer.id as string
    setWishlistBusy(true)
    try {
      const { error } = await toggleSaveOffer(userId, offerId, inWishlist)
      if (error) {
        console.error('Could not update saved offer:', error)
        toast.error('Could not update your saved offers.')
        return
      }
      setInWishlist(!inWishlist)
      toast.success(inWishlist ? 'Removed from saved offers' : 'Saved to favourites')
    } catch (error) {
      console.error('Could not update saved offer:', error)
      toast.error('Could not update your saved offers.')
    } finally {
      setWishlistBusy(false)
    }
  }

  return (
    <div className="esr-offer-detail max-w-2xl mx-auto">
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
          <div className="absolute top-3 right-3 rounded-xl bg-[var(--crimson)] px-3 py-1.5 text-sm font-bold text-white">
            {discountPct}% OFF
          </div>
        )}
        <button type="button" disabled={wishlistBusy} aria-label={`${inWishlist ? 'Remove from' : 'Save to'} favourites`} aria-pressed={inWishlist} onClick={toggleWishlist} className={`absolute left-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ${inWishlist ? 'text-[var(--crimson)]' : 'text-[var(--muted)]'}`}>
          <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Offer Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="mb-1 text-sm font-medium text-[var(--crimson)]">{(restaurant?.categories as { name: string })?.name}</p>
            <h1 className="text-xl font-black text-gray-900">{offer.name as string}</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
              <MapPin size={14} /> {restaurant?.name as string} · {restaurant?.city as string}
            </p>
          </div>
          {avg_rating && (
            <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-muted)] px-2 py-1">
              <Star size={14} className="fill-current text-[var(--crimson)]" />
              <span className="text-sm font-bold text-[var(--crimson)]">{avg_rating}</span>
            </div>
          )}
        </div>

        <div className="flex items-end gap-3 mb-4">
          <span className="text-3xl font-bold text-[var(--crimson)]">Rs {offer.discounted_price as number}</span>
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
              <span key={tag} className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--plum)]">{tag}</span>
            ))}
          </div>
        )}

        {/* Redeem Button */}
        {!userId ? (
          <button onClick={() => router.push('/auth/login')} className="esr-primary-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-4">
            Sign in to Claim <ChevronRight size={18} />
          </button>
        ) : already_claimed ? (
          <button
            type="button"
            aria-expanded={showRedemption}
            aria-controls="offer-redemption-flow"
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
            type="button"
            aria-expanded={showRedemption}
            aria-controls="offer-redemption-flow"
            onClick={() => setShowRedemption(true)}
            className="esr-primary-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-4"
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
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--crimson)]">
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

      {/* Inline redemption flow for legacy offer links */}
      {showRedemption && (
        <RedemptionFlow
          id="offer-redemption-flow"
          offer={offer}
          canReview={already_claimed ? false : can_review}
          onClose={() => setShowRedemption(false)}
        />
      )}
    </div>
  )
}
