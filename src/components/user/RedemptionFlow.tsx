'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Star, ChevronRight, ChevronLeft, Upload, Copy, Check, Ticket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

interface Props {
  id: string
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

export default function RedemptionFlow({ id, offer, canReview, onClose }: Props) {
  const router = useRouter()
  const restaurantTags = ((offer.restaurants as Record<string, unknown>)?.tags as string[]) || []

  const [step, setStep] = useState<Step>(canReview ? 'tags' : 'terms')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({ rating_taste: 0, rating_ambiance: 0, rating_quality: 0, rating_money_value: 0 })
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    sectionRef.current?.focus()
  }, [])

  async function handleRedeem() {
    setLoading(true)
    setError('')
    const toastId = toast.loading('Claiming voucher…')
    try {
      if (canReview) {
        const ratingsList = Object.values(ratings)
        if (ratingsList.some((rating) => rating < 1 || rating > 5) || !comment.trim()) {
          throw new Error('Add a rating and short review before claiming this voucher.')
        }

        const restaurantId = (offer.restaurants as Record<string, unknown> | null)?.id
        if (typeof restaurantId !== 'string') throw new Error('The restaurant details are unavailable.')
        const imageUrls: string[] = []

        if (images.length > 0) {
          const supabase = createClient()
          for (const file of images.slice(0, 5)) {
            const ext = file.name.split('.').pop() || 'jpg'
            const path = `reviews/${offer.id}/${crypto.randomUUID()}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('review-images')
              .upload(path, file)
            if (uploadError) throw new Error(`Could not upload a review photo: ${uploadError.message}`)
            const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(path)
            imageUrls.push(publicUrl)
          }
        }

        const avg = ratingsList.reduce((sum, rating) => sum + rating, 0) / ratingsList.length
        const reviewResponse = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            offer_id: offer.id,
            comment: comment.trim(),
            ...ratings,
            rating_overall: Number(avg.toFixed(1)),
            tags: selectedTags,
            images: imageUrls,
          }),
        })
        const reviewData = await reviewResponse.json().catch(() => ({}))
        if (!reviewResponse.ok) {
          throw new Error(reviewData.error || 'Could not save your review.')
        }
      }

      const res = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offer.id }),
      })
      const data = await res.json()
      if (res.status === 401) {
        toast.error('Please sign in to claim this voucher', { id: toastId })
        router.push('/auth/login')
        return
      }
      if (!res.ok || !data.voucher_code) {
        const message = data.error || data.message || 'Failed to claim voucher.'
        setError(message)
        toast.error(message, { id: toastId })
        return
      }

      setCouponCode(data.voucher_code)
      setStep('done')
      toast.success(data.already_claimed ? 'Showing your claimed voucher' : 'Voucher claimed successfully!', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete the voucher claim.'
      setError(message)
      toast.error(message, { id: toastId })
    } finally {
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
    <section
      ref={sectionRef}
      id={id}
      tabIndex={-1}
      aria-labelledby="redemption-flow-title"
      className="esr-redemption-flow mt-6 w-full rounded-2xl border border-[var(--border)] bg-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--crimson)]"
    >
      <div className="w-full overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {currentIdx > 0 && step !== 'done' && (
              <button type="button" aria-label="Previous step" onClick={goPrev} className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-gray-700"><ChevronLeft size={20} /></button>
            )}
              <h2 id="redemption-flow-title" className="font-bold text-gray-900">
              {step === 'tags' && 'Select Tags'}
              {step === 'rating' && 'Rate Your Experience'}
              {step === 'review' && 'Write a Review'}
              {step === 'terms' && 'Terms & Conditions'}
              {step === 'coupon' && 'Claim Voucher'}
              {step === 'done' && '🎉 Claimed!'}
            </h2>
          </div>
          <button type="button" aria-label="Close voucher flow" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="px-6 pt-3">
            <div className="flex gap-1">
              {stepOrder.map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIdx ? 'bg-[var(--crimson)]' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-5">
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
                          ? 'bg-[var(--crimson)] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-[var(--surface-muted)] hover:text-[var(--crimson)]'
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
                    <span className="text-sm font-bold text-[var(--crimson)]">{ratings[dim.key] || '—'}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setRatings(r => ({ ...r, [dim.key]: v }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                          ratings[dim.key] >= v ? 'bg-[var(--crimson)] text-white' : 'bg-gray-100 text-gray-500'
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
                className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crimson)] resize-none"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Photos (up to 5)</p>
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                      <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                        aria-label={`Remove review photo ${i + 1}`}
                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--crimson)] text-xs text-white">×</button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <button onClick={() => fileRef.current?.click()}
                      aria-label="Add review photos"
                      className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-gray-500 transition-colors hover:border-[var(--crimson)] hover:text-[var(--crimson)]">
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
                  className="mt-0.5 accent-[var(--crimson)]" />
                <span className="text-sm text-gray-700">I have read and agree to the Terms & Conditions</span>
              </label>
            </div>
          )}

          {/* STEP: Coupon */}
          {step === 'coupon' && (
            <div className="space-y-6 text-center">
              <div className="rounded-2xl bg-[var(--surface-muted)] p-6">
                <p className="text-sm text-gray-500 mb-1">Claiming offer at</p>
                <p className="font-black text-gray-900 text-lg">{(offer.restaurants as Record<string, unknown>)?.name as string}</p>
                <p className="font-bold text-[var(--crimson)]">{offer.name as string}</p>
              </div>
              <p className="text-sm text-gray-600">Confirm to claim the active voucher for this offer.</p>
              {error && <p className="text-sm text-[var(--crimson)]">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--crimson)]">
                <Ticket size={24} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Voucher Claimed!</h3>
              <p className="text-gray-600">Show this code at {(offer.restaurants as Record<string, unknown>)?.name as string}.</p>
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Voucher code</p>
                <p className="text-2xl font-black tracking-wider mt-1">{couponCode}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(couponCode)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[var(--crimson)]"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy code'}
                </button>
              </div>
              <button onClick={() => { onClose(); router.refresh() }}
                className="esr-primary-button min-h-11 w-full rounded-xl py-3">
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
                className="esr-primary-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-4 disabled:opacity-60"
              >
                {loading ? <ButtonLoader label="Claiming…" /> : 'Confirm Claim'}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={goNext}
                  disabled={step === 'terms' && !termsAccepted}
                  className="esr-primary-button inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-60"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
