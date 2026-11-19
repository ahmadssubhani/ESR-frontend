import { redirect } from 'next/navigation'
import FavouritesClient from '@/components/user/FavouritesClient'
import { createClient } from '@/lib/supabase/server'

export default async function FavouritesPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(`Could not load your sign-in session: ${authError.message}`)
  if (!user) redirect('/auth/login?next=%2Fuser%2Ffavourites')

  const [{ data: offers, error: offersError }, { data: restaurants, error: restaurantsError }] = await Promise.all([
    supabase
      .from('user_offers')
      .select('id, offer_id, offers(id, name, discounted_price, original_price, image_url, restaurant_id, restaurants(name, cover_url, categories(name)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_restaurants')
      .select('id, restaurant_id, restaurants(id, name, city, cover_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])
  const queryError = offersError || restaurantsError
  if (queryError) throw new Error(`Could not load saved places: ${queryError.message}`)

  return (
    <FavouritesClient
      initialItems={offers || []}
      initialRestaurants={restaurants || []}
      userId={user.id}
    />
  )
}
