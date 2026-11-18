import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/server'
import { jsonApi } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return jsonApi(request, null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  const full_name = body.full_name ? String(body.full_name) : undefined
  if (!email || !password) {
    return jsonApi(request, { error: 'email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return jsonApi(request, { error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: full_name ? { full_name } : undefined,
    },
  })
  if (error) {
    return jsonApi(request, { error: error.message }, { status: 400 })
  }

  return jsonApi(
    request,
    {
      user: data.user,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            token_type: 'bearer',
          }
        : null,
      message: data.session ? 'Account created' : 'Check your email to confirm your account',
    },
    { status: 201 }
  )
}
