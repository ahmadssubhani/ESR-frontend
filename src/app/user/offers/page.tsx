import { Suspense } from 'react'
import type { Metadata } from 'next'
import OffersClient from '@/components/user/OffersClient'
import { DEMO_OFFERS } from '@/lib/demo-data'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Discover restaurants | ESR',
  description: 'Explore restaurants and dining offers across Pakistan.',
}

export default async function OffersPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
  let offers = DEMO_OFFERS

  if (!demoMode) {
    try {
      const supabase = await createAdminClient()
      const { data, error } = await supabase
        .from('offers')
        .select('*, restaurants!inner(id, name, city, address, country, description, phone_number, opening_hours, lat, lng, cover_url, image_url, logo_url, is_featured, tags, restaurant_type, website, categories(name))')
        .eq('approval_status', true)
        .eq('is_redeemable', true)
        .eq('is_bumper', false)
        .eq('restaurants.is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_till', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(40)
      if (error) throw error
      offers = (data || []) as typeof DEMO_OFFERS
    } catch (error) {
      console.error('Live offers unavailable; showing demo restaurants instead:', error)
    }
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm font-semibold text-[var(--muted)]">
          Loading restaurants…
        </div>
      }
    >
      <OffersClient initialOffers={offers} demoMode={demoMode || offers === DEMO_OFFERS} />
    </Suspense>
  )
}
