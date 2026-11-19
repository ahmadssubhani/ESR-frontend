import FavouritesClient from '@/components/user/FavouritesClient'

export default function FavouritesPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
  if (demoMode) return <FavouritesClient initialItems={[]} demoMode />
  return <FavouritesPageLive />
}

async function FavouritesPageLive() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <FavouritesClient initialItems={[]} demoMode />
  const { data } = await supabase
    .from('user_offers')
    .select(`*, offers(*, restaurants(id, name, cover_url, logo_url, categories(name)))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return <FavouritesClient initialItems={data || []} />
}
