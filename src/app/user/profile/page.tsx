import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/user/ProfileClient'
import { DEMO_USER } from '@/lib/demo-data'

export default async function ProfilePage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
  if (demoMode) {
    return (
      <ProfileClient
        profile={{
          id: DEMO_USER.id,
          full_name: DEMO_USER.name,
          email: 'ayesha@example.com',
          image_url: DEMO_USER.avatar,
          avatar_url: DEMO_USER.avatar,
        }}
        reviews={[]}
        redemptions={[]}
        demoMode
      />
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <ProfileClient profile={null} reviews={[]} redemptions={[]} demoMode />
    )
  }

  const [{ data: profile }, { data: reviews }, { data: redemptions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('reviews').select('*, restaurants(name), offers(name), review_images(image_url)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('user_coupons').select('*, offers(name, restaurants(name))').eq('user_id', user.id).order('used_at', { ascending: false }),
  ])

  const mappedProfile = profile
    ? {
        id: profile.id,
        full_name: profile.full_name ?? undefined,
        phone: profile.phone ?? undefined,
        email: user?.email ?? undefined,
        image_url: profile.image_url ?? undefined,
        avatar_url: profile.image_url ?? undefined,
      }
    : null

  return <ProfileClient profile={mappedProfile} reviews={reviews || []} redemptions={redemptions || []} />
}
