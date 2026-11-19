import { Suspense } from 'react'
import type { Metadata } from 'next'
import OffersClient, { type OfferWithRestaurant } from '@/components/user/OffersClient'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Discover restaurants | ESR',
  description: 'Explore restaurants and dining offers across Pakistan.',
}

export default async function OffersPage() {
  const supabase = await createClient()
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

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm font-semibold text-[var(--muted)]">
          Loading restaurants…
        </div>
      }
    >
      <OffersClient initialOffers={(data || []) as OfferWithRestaurant[]} initialError={error?.message || ''} />
    </Suspense>
  )
}
