'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, Shield, Check, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

interface ProfileProps {
  profile: {
    id: string
    full_name?: string
    phone?: string
    email?: string
    image_url?: string
    avatar_url?: string
  } | null
  reviews: any[]
  redemptions: any[]
  demoMode?: boolean
}

export default function ProfileClient({ profile, reviews = [], redemptions = [], demoMode = false }: ProfileProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'reviews' | 'history'>('profile')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [email] = useState(profile?.email || '')
  const pendingAvatarFile = useRef<File | null>(null)

  const [avatarUrl, setAvatarUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_avatar') || profile?.image_url || profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    }
    return profile?.image_url || profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      pendingAvatarFile.current = file
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      if (demoMode) {
        localStorage.setItem('user_name', fullName)
        localStorage.setItem('user_phone', phone)
        if (avatarUrl) localStorage.setItem('user_avatar', avatarUrl)
        window.dispatchEvent(new Event('user-avatar-changed'))
        setSaveSuccess(true)
        toast.success('Demo profile saved in this browser')
        return
      }

      let nextImageUrl = profile?.image_url || profile?.avatar_url || null
      const file = pendingAvatarFile.current

      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `avatars/${profile?.id || 'user'}/${Date.now()}.${ext}`
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })

        if (uploadError || !uploaded) {
          throw new Error(uploadError?.message || 'Failed to upload profile picture')
        }

        const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(path)
        nextImageUrl = publicUrl
      } else if (avatarUrl && !avatarUrl.startsWith('data:')) {
        nextImageUrl = avatarUrl
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          image_url: nextImageUrl,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update profile')
      }

      const savedImageUrl = payload.image_url || nextImageUrl
      if (savedImageUrl) {
        setAvatarUrl(savedImageUrl)
        localStorage.setItem('user_avatar', savedImageUrl)
      }
      localStorage.setItem('user_name', fullName)
      localStorage.setItem('user_phone', phone)
      pendingAvatarFile.current = null
      window.dispatchEvent(new Event('user-avatar-changed'))

      setSaveSuccess(true)
      toast.success('Profile updated')
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (error) {
      console.error('Error updating profile:', error)
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      setSaveError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full px-4 py-6 space-y-6">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
        <Image
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=90"
          alt="Background Texture"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-red-100 p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group w-20 h-20 rounded-full overflow-hidden border-3 border-red-600 bg-red-950 shrink-0 shadow-md">
              <Image
                src={avatarUrl}
                alt="Profile Picture"
                fill
                unoptimized={avatarUrl.startsWith('data:') || avatarUrl.includes('supabase.co')}
                className="object-cover brightness-95 contrast-110"
              />
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={20} />
                <span className="text-[10px] font-extrabold mt-0.5">Change</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h1 className="text-xl font-black text-gray-900">{fullName || 'Your Profile'}</h1>
              <p className="text-xs text-red-600 font-bold mt-0.5 flex items-center gap-1">
                <Shield size={13} /> ESR Verified Foodie Member
              </p>
            </div>
          </div>

          <a
            href="/auth/signout"
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors border border-red-200"
          >
            Sign out
          </a>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-red-100 shadow-sm flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${
              activeTab === 'profile' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-red-50'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${
              activeTab === 'reviews' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-red-50'
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-red-50'
            }`}
          >
            History ({redemptions.length})
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-red-100 p-6 shadow-md space-y-6">
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-red-50/50 border border-red-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-red-600" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-xs font-medium text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-red-600" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-red-50/50 border border-red-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800"
                />
              </div>

              {saveError && (
                <p className="text-xs font-semibold text-red-600 text-center">{saveError}</p>
              )}

              <div className="pt-3 flex justify-center">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-64 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <ButtonLoader label="Saving…" />
                  ) : saveSuccess ? (
                    <>
                      <Check size={16} className="text-white" />
                      <span>Updated Successfully!</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-red-100 p-6 shadow-md space-y-4">
            <h2 className="text-sm font-extrabold text-gray-900">Your Submitted Reviews</h2>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-semibold bg-red-50/30 rounded-2xl border border-dashed border-red-200">
                You haven&apos;t written any reviews yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev: any, idx: number) => (
                  <div key={idx} className="p-4 border border-red-100 rounded-2xl space-y-2 bg-red-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-600">{rev.restaurants?.name}</span>
                      <span className="text-xs text-amber-500 font-bold">★ {rev.rating}.0</span>
                    </div>
                    <p className="text-xs text-gray-700">{rev.review_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-red-100 p-6 shadow-md space-y-4">
            <h2 className="text-sm font-extrabold text-gray-900">Voucher Redemption History</h2>
            {redemptions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-semibold bg-red-50/30 rounded-2xl border border-dashed border-red-200">
                No voucher redemptions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {redemptions.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 border border-red-100 rounded-2xl flex items-center justify-between bg-red-50/20">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{item.offers?.name}</h4>
                      <p className="text-[11px] text-gray-500">{item.offers?.restaurants?.name}</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Redeemed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
