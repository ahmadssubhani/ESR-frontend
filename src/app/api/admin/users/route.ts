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

  const { user_id, role, restaurant_id } = await request.json()
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', user_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (restaurant_id) {
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
