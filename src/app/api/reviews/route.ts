import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient, getApiUser } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error } = await supabase
    .from('reviews')
    .select(`*, profiles(full_name, image_url), restaurants(name), offers(name), review_images(image_url)`)
    .eq('is_active', true)
    .order('rating_overall', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { images, ...reviewData } = body

  const adminClient = await createAdminClient()
  const { data: review, error } = await adminClient
    .from('reviews')
    .insert({ ...reviewData, user_id: user.id, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (images && Array.isArray(images) && images.length > 0) {
    const { error: imageError } = await adminClient.from('review_images').insert(
      images.map((url: string) => ({ review_id: review.id, image_url: url }))
    )
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 })
  }

  const fullSelect = `*, profiles(full_name, image_url), restaurants(id, name, cover_url), offers(name, image_url), review_images(image_url), review_likes(user_id), review_comments(id)`
  const basicSelect = `*, profiles(full_name, image_url), restaurants(id, name, cover_url), offers(name, image_url), review_images(image_url), review_likes(user_id)`

  const { data: withComments } = await adminClient
    .from('reviews')
    .select(fullSelect)
    .eq('id', review.id)
    .maybeSingle()

  const { data: basic } = withComments
    ? { data: withComments }
    : await adminClient.from('reviews').select(basicSelect).eq('id', review.id).maybeSingle()

  const payload = {
    ...(basic ?? review),
    review_images:
      (basic as { review_images?: { image_url: string }[] } | null)?.review_images?.length
        ? (basic as { review_images: { image_url: string }[] }).review_images
        : (images || []).map((url: string) => ({ image_url: url })),
  }

  return NextResponse.json(payload, { status: 201 })
}
