import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/server'
import { jsonApi } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return jsonApi(request, null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const refresh_token = String(body.refresh_token || '')
  if (!refresh_token) {
    return jsonApi(request, { error: 'refresh_token is required' }, { status: 400 })
  }

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.refreshSession({ refresh_token })
  if (error || !data.session) {
    return jsonApi(request, { error: error?.message || 'Invalid refresh token' }, { status: 401 })
  }

  return jsonApi(request, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: 'bearer',
    user: data.user,
  })
}
