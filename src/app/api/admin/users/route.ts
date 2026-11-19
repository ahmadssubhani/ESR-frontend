import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .select('*, restaurants(id, name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid user role update.' }, { status: 400 })
  }
  const { user_id, role, restaurant_id } = body as {
    user_id?: unknown
    role?: unknown
    restaurant_id?: unknown
  }
  if (
    typeof user_id !== 'string' ||
    !['user', 'restaurant', 'admin'].includes(String(role)) ||
    (restaurant_id !== undefined && typeof restaurant_id !== 'string')
  ) {
    return NextResponse.json({ error: 'Invalid user role update.' }, { status: 400 })
  }
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .update({ role: role as 'user' | 'restaurant' | 'admin' })
    .eq('id', user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (typeof restaurant_id === 'string') {
    const { error: restaurantError } = await adminClient
      .from('restaurants')
      .update({ owner_id: user_id })
      .eq('id', restaurant_id)

    if (restaurantError) {
      return NextResponse.json({ error: restaurantError.message }, { status: 400 })
    }
  }

  return NextResponse.json(data)
}
