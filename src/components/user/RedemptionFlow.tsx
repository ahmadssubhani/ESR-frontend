'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Star, ChevronRight, ChevronLeft, Upload, Copy, Check, Ticket, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'
import { formatVoucherCountdown, generateEsrVoucherCode } from '@/lib/esr-voucher-code'

interface Props {
  offer: Record<string, unknown>
  canReview: boolean
  onClose: () => void
}

type Step = 'tags' | 'rating' | 'review' | 'terms' | 'coupon' | 'done'

const RATING_DIMS = [
  { key: 'rating_taste', label: 'Taste' },
  { key: 'rating_ambiance', label: 'Ambiance' },
  { key: 'rating_quality', label: 'Quality' },
  { key: 'rating_money_value', label: 'Value for Money' },
]

export default function RedemptionFlow({ offer, canReview, onClose }: Props) {
  const router = useRouter()
  const restaurantTags = ((offer.restaurants as Record<string, unknown>)?.tags as string[]) || []

  const [step, setStep] = useState<Step>(canReview ? 'tags' : 'terms')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({ rating_taste: 0, rating_ambiance: 0, rating_quality: 0, rating_money_value: 0 })
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [voucherCountdown, setVoucherCountdown] = useState('30:00')
  const [copied, setCopied] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step !== 'done' || !couponCode) return
    const tick = () => {
      setCouponCode(generateEsrVoucherCode(String(offer.id)))
      setVoucherCountdown(formatVoucherCountdown())
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [step, couponCode, offer.id])

  async function handleRedeem() {
    setLoading(true)
    setError('')
    const toastId = toast.loading('Claiming voucher…')
    try {
      const res = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offer.id }),
      })
      const data = await res.json()
      if (res.status === 401) {
        toast.error('Please sign in to claim this voucher', { id: toastId })
        router.push('/auth/login')
        setLoading(false)
        return
      }
      if (!res.ok || !data.voucher_code) {
        const message = data.error || data.message || 'Failed to claim voucher.'
        setError(message)
        toast.error(message, { id: toastId })
        setLoading(false)
        return
      }
      setCouponCode(generateEsrVoucherCode(String(offer.id)))

      if (canReview && ratings.rating_taste > 0) {
        const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / 4
        let imageUrls: string[] = []

        // Upload images to Supabase Storage
        if (images.length > 0) {
          const supabase = createClient()
          for (const file of images.slice(0, 5)) {
            const ext = file.name.split('.').pop()
            const path = `reviews/${offer.id}/${Date.now()}.${ext}`
            const { data: uploaded } = await supabase.storage.from('review-images').upload(path, file)
            if (uploaded) {
              const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(path)
              imageUrls.push(publicUrl)
            }
          }
        }

        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: (offer.restaurants as Record<string, unknown>)?.id,
            offer_id: offer.id,
            comment,
            ...ratings,
            rating_overall: avg.toFixed(1),
            tags: selectedTags,
            images: imageUrls,
          }),
        })
      }

      setSuccess(true)
      setLoading(false)
      setStep('done')
      toast.success(data.already_claimed ? 'Showing your claimed voucher' : 'Voucher claimed successfully!', { id: toastId })
    } catch {
      toast.error('Something went wrong. Please try again.', { id: toastId })
      setLoading(false)
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const stepOrder: Step[] = canReview ? ['tags', 'rating', 'review', 'terms', 'coupon'] : ['terms', 'coupon']
  const currentIdx = stepOrder.indexOf(step)

  function goNext() {
    const next = stepOrder[currentIdx + 1]
    if (next) setStep(next)
  }
  function goPrev() {
    const prev = stepOrder[currentIdx - 1]
    if (prev) setStep(prev)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {currentIdx > 0 && step !== 'done' && (
              <button onClick={goPrev} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></button>
            )}
            <h2 className="font-black text-gray-900">
              {step === 'tags' && 'Select Tags'}
              {step === 'rating' && 'Rate Your Experience'}
              {step === 'review' && 'Write a Review'}
              {step === 'terms' && 'Terms & Conditions'}
              {step === 'coupon' && 'Claim Voucher'}
              {step === 'done' && '🎉 Claimed!'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="px-6 pt-3">
            <div className="flex gap-1">
              {stepOrder.map((s, i) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= currentIdx ? 'bg-red-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* STEP: Tags */}
          {step === 'tags' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">What describes this restaurant? Select all that apply.</p>
              {restaurantTags.length === 0 ? (
                <p className="text-gray-400 text-sm">No tags available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {restaurantTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: Rating */}
          {step === 'rating' && (
            <div className="space-y-5">
              {RATING_DIMS.map(dim => (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{dim.label}</span>
                    <span className="text-sm font-bold text-red-600">{ratings[dim.key] || '—'}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setRatings(r => ({ ...r, [dim.key]: v }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                          ratings[dim.key] >= v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                        <Star size={16} className="mx-auto" fill={ratings[dim.key] >= v ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP: Review text + photos */}
          {step === 'review' && (
            <div className="space-y-4">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell others about your experience…"
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Photos (up to 5)</p>
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                      <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[rgb(220, 38, 38)] hover:text-[rgb(220, 38, 38)] transition-colors">
                      <Upload size={18} />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { if (e.target.files) setImages(imgs => [...imgs, ...Array.from(e.target.files!)].slice(0, 5)) }} />
              </div>
            </div>
          )}

          {/* STEP: Terms */}
          {step === 'terms' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2 max-h-48 overflow-y-auto">
                <p className="font-bold text-gray-900">Terms & Conditions</p>
                <p>1. Each voucher can only be claimed once per 24 hours.</p>
                <p>2. You can claim a maximum of 5 vouchers per 24 hours.</p>
                <p>3. Show the voucher code to restaurant staff at checkout.</p>
                <p>4. ESR is not responsible if a restaurant refuses to honour an offer.</p>
                <p>5. Offers are subject to availability and may expire without notice.</p>
                <p>6. Discounts cannot be combined with other promotions.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-[rgb(220, 38, 38)]" />
                <span className="text-sm text-gray-700">I have read and agree to the Terms & Conditions</span>
              </label>
            </div>
          )}

          {/* STEP: Coupon */}
          {step === 'coupon' && (
            <div className="space-y-6 text-center">
              <div className="bg-red-50 rounded-2xl p-6">
                <p className="text-sm text-gray-500 mb-1">Claiming offer at</p>
                <p className="font-black text-gray-900 text-lg">{(offer.restaurants as Record<string, unknown>)?.name as string}</p>
                <p className="text-red-600 font-bold">{offer.name as string}</p>
              </div>
              <p className="text-sm text-gray-600">Confirm to save this claim. You will get an ESR- five-digit code that refreshes every 30 minutes.</p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Ticket size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Voucher Claimed!</h3>
              <p className="text-gray-600">Show this code at {(offer.restaurants as Record<string, unknown>)?.name as string}.</p>
              <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-2xl p-4">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Voucher code</p>
                <p className="text-2xl font-black tracking-wider mt-1">{couponCode}</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-red-600">
                  <Clock size={13} />
                  Refreshes in {voucherCountdown}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(couponCode)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-600"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy code'}
                </button>
              </div>
              <button onClick={() => { onClose(); router.refresh() }}
                className="w-full bg-[rgb(220,38,38)] text-white font-bold py-3 rounded-xl hover:bg-[#C4341F] transition-colors">
                Back to Offers
              </button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {step !== 'done' && (
          <div className="px-6 pb-6 pt-4 border-t border-gray-100">
            {step === 'coupon' ? (
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full bg-[rgb(220,38,38)] text-white font-bold py-4 rounded-xl hover:bg-[#C4341F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <ButtonLoader label="Claiming…" /> : 'Confirm Claim'}
              </button>
            ) : (
              <div className="flex gap-3">
                {canReview && step !== 'tags' && (
                  <button onClick={() => setStep('terms')} className="flex-1 border-2 border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:border-gray-300 transition-colors text-sm">
                    Skip Review
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={step === 'terms' && !termsAccepted}
                  className="flex-1 bg-[rgb(220, 38, 38)] text-white font-bold py-3 rounded-xl hover:bg-[#C4341F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
