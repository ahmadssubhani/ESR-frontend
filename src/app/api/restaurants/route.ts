import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('restaurants')
    .select(`*, categories(name), reviews(rating_overall)`)
    .eq('is_active', true)

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`)
  }

  const { data, error } = await query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'restaurant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('restaurants')
    .insert({ ...body, owner_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
