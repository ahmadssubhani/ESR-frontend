import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/server'
import { jsonApi } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return jsonApi(request, null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const body = await request.json().catch(() => ({}))
  const refresh_token = body.refresh_token ? String(body.refresh_token) : undefined

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (accessToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refresh_token || accessToken,
    })
  }
  const { error } = await supabase.auth.signOut({ scope: refresh_token ? 'local' : 'global' })
  if (error) {
    return jsonApi(request, { error: error.message }, { status: 400 })
  }
  return jsonApi(request, { message: 'Signed out' })
}
