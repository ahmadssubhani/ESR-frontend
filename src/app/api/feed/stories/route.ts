import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'
import { parseSocialMediaUrl } from '@/lib/foodie-feed'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feed_stories')
    .select('id, user_id, media_url, media_type, caption, source, external_url, embed_url, created_at, profiles(full_name, image_url)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await request.json()
  const caption = typeof payload.caption === 'string' ? payload.caption.trim().slice(0, 280) : null
  const restaurantId = typeof payload.restaurant_id === 'string' ? payload.restaurant_id : null
  const socialUrl = typeof payload.social_url === 'string' ? payload.social_url.trim() : ''

  if (socialUrl) {
    const parsed = parseSocialMediaUrl(socialUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Paste a public Instagram Reel/post or Facebook video URL.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('feed_stories')
      .insert({
        user_id: user.id,
        media_type: 'embed',
        source: parsed.source,
        external_url: parsed.externalUrl,
        embed_url: parsed.embedUrl,
        caption,
        restaurant_id: restaurantId,
      })
      .select('id, user_id, media_url, media_type, caption, source, external_url, embed_url, created_at, profiles(full_name, image_url)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  }

  const mediaUrl = typeof payload.media_url === 'string' ? payload.media_url : ''
  const mediaType = payload.media_type === 'video' ? 'video' : 'image'
  if (!mediaUrl) {
    return NextResponse.json({ error: 'Upload a photo/video or paste a social URL.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feed_stories')
    .insert({
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
      source: 'esr',
      caption,
      restaurant_id: restaurantId,
    })
    .select('id, user_id, media_url, media_type, caption, source, external_url, embed_url, created_at, profiles(full_name, image_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
