import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/ensure-profile'
import ProfileClient from '@/components/user/ProfileClient'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(`Could not load your account: ${authError.message}`)
  if (!user) redirect('/auth/login?next=%2Fuser%2Fprofile')

  await ensureUserProfile(user)
  const [{ data: profile, error: profileError }, { data: reviews, error: reviewsError }, { data: redemptions, error: redemptionError }, { data: views, error: viewsError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, phone, email, image_url, avatar_url')
        .eq('id', user.id)
        .single(),
      supabase
        .from('reviews')
        .select('id, user_id, created_at, rating_overall, comment, restaurants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_coupons')
        .select('id, used_at, offers(name, restaurants(name))')
        .eq('user_id', user.id)
        .order('used_at', { ascending: false }),
      supabase
        .from('restaurant_views')
        .select('id, viewed_at, restaurants(name, city)')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(30),
    ])

  const queryError = profileError || reviewsError || redemptionError || viewsError
  if (queryError) throw new Error(`Could not load account data: ${queryError.message}`)

  const params = await searchParams
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const initialTab = requestedTab === 'reviews' || requestedTab === 'history' ? requestedTab : 'profile'
  const fullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ''

  return (
    <ProfileClient
      profile={{
        id: user.id,
        full_name: fullName,
        phone: profile?.phone || '',
        email: user.email || profile?.email || '',
        avatar_url: profile?.avatar_url || profile?.image_url || null,
        emailConfirmed: Boolean(user.email_confirmed_at),
      }}
      reviews={reviews || []}
      redemptions={redemptions || []}
      views={views || []}
      initialTab={initialTab}
    />
  )
}
