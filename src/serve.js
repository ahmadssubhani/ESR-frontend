import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Environment variables with fallbacks
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mkkikveswkxltsrlozhs.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2lrdmVzd2t4bHRzcmxvemhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDE1MzAsImV4cCI6MjEwMTMxNzUzMH0.ZMuw6qrfYlASAhRMY3VabTEGnfkTSVVtbta-Vz_SzlM'

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 1. Browser Client (Client Components / 'use client')
export function getSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export function createClient() {
  return getSupabaseBrowserClient()
}

// Helper to save/unsave offers
export async function toggleSaveOffer(userId, offerId, isSaved) {
  const supabase = getSupabaseBrowserClient()
  if (isSaved) {
    return await supabase.from('user_offers').delete().eq('user_id', userId).eq('offer_id', offerId)
  } else {
    return await supabase.from('user_offers').insert({ user_id: userId, offer_id: offerId })
  }
}

// 2. Server Client (Server Components & Server Actions)
export async function createServerClientInstance() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Expected when called from Server Components directly
        }
      },
    },
  })
}

// 3. Admin Client (Bypasses RLS using Service Role Key)
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Expected when called from Server Components directly
          }
        },
      },
    }
  )
}

// 4. Middleware Session Handler
export async function handleSupabaseSessionMiddleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

// 5. Auth Helpers
export const authBackend = {
  async signInWithGoogle(redirectToPath = '/user/offers') {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectToPath}`,
      },
    })
  },

  async signInWithEmail(email, password) {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signInWithPassword({ email, password })
  },

  async signUp(email, password, redirectToPath = '/user/offers') {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectToPath}`,
      },
    })
  },

  async signOut() {
    const supabase = getSupabaseBrowserClient()
    return await supabase.signOut()
  },

  async getCurrentUser() {
    const supabase = getSupabaseBrowserClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) return null
    return user
  },
}