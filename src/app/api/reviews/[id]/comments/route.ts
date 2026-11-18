import { NextRequest, NextResponse } from 'next/server'
import { createClient , getApiUser } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_comments')
    .select('id, review_id, user_id, body, created_at, profiles(full_name, image_url)')
    .eq('review_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await request.json()
  const text = typeof body === 'string' ? body.trim() : ''
  if (text.length < 1 || text.length > 1000) {
    return NextResponse.json({ error: 'Comment must be 1–1000 characters.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('review_comments')
    .insert({ review_id: id, user_id: user.id, body: text })
    .select('id, review_id, user_id, body, created_at, profiles(full_name, image_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
