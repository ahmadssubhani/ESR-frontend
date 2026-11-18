import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_offers')
    .select(`*, offers(*, restaurants(id, name, cover_url, logo_url, categories(name)))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { offer_id } = await request.json()
  const { data, error } = await supabase
    .from('user_offers')
    .insert({ user_id: user.id, offer_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ message: 'Already in wishlist' }, { status: 200 })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ message: 'Added to favourites', data }, { status: 201 })
}
