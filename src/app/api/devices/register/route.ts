import { NextRequest } from 'next/server'
import { createClient, createServiceClient, getApiUser } from '@/lib/supabase/server'
import { jsonApi } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return jsonApi(request, null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await getApiUser(supabase)
  if (!user) {
    return jsonApi(request, { error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const push_token = String(body.push_token || body.token || '').trim()
  const platform = String(body.platform || 'unknown').trim()
  if (!push_token) {
    return jsonApi(request, { error: 'push_token is required' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await (admin as any)
    .from('user_devices')
    .upsert(
      {
        user_id: user.id,
        push_token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    )
    .select()
    .single()

  if (error) {
    return jsonApi(
      request,
      {
        error: error.message,
        hint: 'Run supabase/migrations/user_devices.sql if the user_devices table is missing.',
      },
      { status: 500 }
    )
  }
  return jsonApi(request, data, { status: 201 })
}
