import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const search = searchParams.get('search')

  let query = supabase
    .from('offers')
    .select(`*, restaurants!inner(id, name, lat, lng, cover_url, logo_url, is_featured, categories(name)), reviews(rating_overall)`)
    .eq('approval_status', true)
    .eq('is_redeemable', true)
    .eq('is_bumper', false)
    .eq('restaurants.is_active', true)

  if (search) {
    query = query.or(`name.ilike.%${search}%,restaurants.name.ilike.%${search}%`)
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
  const body = await request.json()
  const isAdmin = profile?.role === 'admin'
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('offers')
    .insert({
      ...body,
      approval_status: isAdmin ? Boolean(body.approval_status ?? true) : false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
