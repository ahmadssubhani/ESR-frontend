import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type NavProfile = {
  full_name: string | null
  image_url: string | null
  avatar_url: string | null
  role: string
}

function profileFromUser(user: User): NavProfile {
  const meta = user.user_metadata ?? {}
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (user.email ? user.email.split('@')[0] : null) ||
    'Account'

  const imageUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null

  return {
    full_name: fullName,
    image_url: imageUrl,
    avatar_url: imageUrl,
    role: 'user',
  }
}

/**
 * Load or create the authenticated user's own profile using their RLS session.
 */
export async function ensureUserProfile(user: User): Promise<NavProfile> {
  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from('profiles')
    .select('full_name, image_url, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle()

  if (loadError) throw loadError
  if (existing) {
    return {
      full_name: existing.full_name,
      image_url: existing.image_url,
      avatar_url: existing.avatar_url,
      role: existing.role,
    }
  }

  const fallback = profileFromUser(user)
  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: fallback.full_name,
    phone: null,
    location: null,
    image_url: fallback.image_url,
    avatar_url: fallback.avatar_url,
    registration_code: null,
    role: 'user',
  }, { onConflict: 'id' })
    .select('full_name, image_url, avatar_url, role')
    .single()

  if (error) throw error
  return {
    full_name: created.full_name,
    image_url: created.image_url,
    avatar_url: created.avatar_url,
    role: created.role,
  }
}
