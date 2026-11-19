import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

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

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid review details.' }, { status: 400 })
  }
  const { images, ...reviewData } = body as Record<string, unknown>
  const imageUrls = Array.isArray(images)
    ? images.filter((image): image is string => typeof image === 'string')
    : []
  if (
    typeof reviewData.restaurant_id !== 'string' ||
    typeof reviewData.comment !== 'string' ||
    typeof reviewData.rating_overall !== 'number'
  ) {
    return NextResponse.json({ error: 'Restaurant, rating, and review text are required.' }, { status: 400 })
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      restaurant_id: reviewData.restaurant_id,
      offer_id: typeof reviewData.offer_id === 'string' ? reviewData.offer_id : null,
      comment: reviewData.comment.trim(),
      rating_overall: reviewData.rating_overall,
      rating_taste: typeof reviewData.rating_taste === 'number' ? reviewData.rating_taste : null,
      rating_ambiance: typeof reviewData.rating_ambiance === 'number' ? reviewData.rating_ambiance : null,
      rating_quality: typeof reviewData.rating_quality === 'number' ? reviewData.rating_quality : null,
      rating_money_value:
        typeof reviewData.rating_money_value === 'number' ? reviewData.rating_money_value : null,
      tags: Array.isArray(reviewData.tags)
        ? reviewData.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      user_id: user.id,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (imageUrls.length > 0) {
    const { error: imageError } = await supabase.from('review_images').insert(
      imageUrls.map((url) => ({ review_id: review.id, image_url: url }))
    )
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 })
  }

  const fullSelect = `*, profiles(full_name, image_url), restaurants(id, name, cover_url), offers(name, image_url), review_images(image_url), review_likes(user_id), review_comments(id)`
  const basicSelect = `*, profiles(full_name, image_url), restaurants(id, name, cover_url), offers(name, image_url), review_images(image_url), review_likes(user_id)`

  const { data: withComments } = await supabase
    .from('reviews')
    .select(fullSelect)
    .eq('id', review.id)
    .maybeSingle()

  const { data: basic } = withComments
    ? { data: withComments }
    : await supabase.from('reviews').select(basicSelect).eq('id', review.id).maybeSingle()

  const payload = {
    ...(basic ?? review),
    review_images:
      (basic as { review_images?: { image_url: string }[] } | null)?.review_images?.length
        ? (basic as { review_images: { image_url: string }[] }).review_images
        : imageUrls.map((url) => ({ image_url: url })),
  }

  return NextResponse.json(payload, { status: 201 })
}
