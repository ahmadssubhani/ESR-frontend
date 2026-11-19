import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, profiles(full_name, image_url), restaurants(name), offers(name), review_images(image_url), review_likes(user_id)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid review details.' }, { status: 400 })
  }
  const values = body as Record<string, unknown>
  const update: { comment?: string; rating_overall?: number; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (typeof values.comment === 'string') update.comment = values.comment.trim()
  if (typeof values.rating_overall === 'number') update.rating_overall = values.rating_overall
  if (!Object.keys(update).some((key) => key !== 'updated_at')) {
    return NextResponse.json({ error: 'No review changes provided.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('reviews').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Deleted' })
}
