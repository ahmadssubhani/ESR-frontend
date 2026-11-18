import type { User } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type NavProfile = {
  full_name: string | null
  image_url: string | null
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
    role: 'customer',
  }
}

/**
 * Load the user's profile for the navbar. If the auth user has no profiles row
 * (common when the DB trigger was missing), create one. Always returns a
 * nav profile when `user` is present so logged-in UI is not email-dependent.
 */
export async function ensureUserProfile(user: User): Promise<NavProfile> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('profiles')
    .select('full_name, image_url, role')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    return {
      full_name: existing.full_name,
      image_url: existing.image_url,
      role: existing.role,
    }
  }

  const fallback = profileFromUser(user)
  const row = {
    id: user.id,
    email: user.email ?? null,
    full_name: fallback.full_name,
    phone: null,
    location: null,
    image_url: fallback.image_url,
    registration_code: null,
    role: 'customer' as const,
  }

  // Prefer service-role upsert (bypasses missing INSERT RLS). Fall back to
  // anon upsert in case an insert-own-profile policy exists.
  const clients = []
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clients.push(await createAdminClient())
    }
  } catch {
    // ignore admin client init failures
  }
  clients.push(supabase)

  for (const client of clients) {
    try {
      const { data: upserted, error } = await client
        .from('profiles')
        .upsert(row, { onConflict: 'id' })
        .select('full_name, image_url, role')
        .single()

      if (!error && upserted) {
        return {
          full_name: upserted.full_name,
          image_url: upserted.image_url,
          role: upserted.role,
        }
      }
    } catch (err) {
      console.error('Failed to upsert missing profile:', err)
    }
  }

  // Navbar still works even if DB insert is blocked.
  return fallback
}
