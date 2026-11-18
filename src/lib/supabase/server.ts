import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Environment credentials with fallback defaults
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 1. Client-Side Browser Client
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

/** Bearer token from Authorization header (mobile / API clients). */
export async function extractAccessToken(): Promise<string | null> {
  const headerStore = await headers()
  const match = headerStore.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

/** Resolve user from cookie session or Bearer JWT (required for mobile). */
export async function getApiUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const token = await extractAccessToken()
  if (token) {
    return supabase.auth.getUser(token)
  }
  return supabase.auth.getUser()
}

// 2. Server-Side Client (Standard / User Context)
export async function createClient() {
  const accessToken = await extractAccessToken()
  if (accessToken) {
    return createSupabaseJsClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
          // Handled via Middleware in Server Components
        }
      },
    },
  })
}

// 3. Server-Side Admin Client (Bypasses RLS)
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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
            // Handled via Middleware in Server Components
          }
        },
      },
    }
  )
}

/** Service-role client with no user cookies, so RLS is actually bypassed. */
export function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createSupabaseJsClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// 4. Client-Side Auth Helper Functions
export const authBackend = {
  // Google OAuth Login
  async signInWithGoogle() {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  },

  // Email & Password Sign In
  async signInWithEmail(email: string, password: string) {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signInWithPassword({ email, password })
  },

  // Email Sign Up
  async signUp(email: string, password: string) {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  },

  // Passwordless Magic Link Login
  async sendMagicLink(email: string) {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  },

  // Sign Out
  async signOut() {
    const supabase = getSupabaseBrowserClient()
    return await supabase.auth.signOut()
  },

  // Get Current Authenticated User (Client Side)
  async getCurrentUser() {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) return null
    return user
  },
}

// 5. Middleware Session Handler
export async function handleSupabaseSessionMiddleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
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

// 6. OAuth & Magic Link Callback Route Handler
export async function handleAuthCallback(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
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
              // Handled via Middleware
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
