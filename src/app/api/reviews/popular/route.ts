import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, profiles(full_name, image_url), restaurants(name), offers(name), review_images(image_url), review_likes(user_id)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort by likes count
  const sorted = data
    .map(r => ({ ...r, likes_count: r.review_likes?.length || 0 }))
    .sort((a, b) => b.likes_count - a.likes_count)

  return NextResponse.json(sorted)
}
