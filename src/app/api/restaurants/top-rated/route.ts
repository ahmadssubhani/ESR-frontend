import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select(`*, categories(name), reviews(rating_overall)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort by average rating
  const sorted = data
    .map(r => {
      const ratings = r.reviews
        .map((rv) => rv.rating_overall)
        .filter((n): n is number => n != null)
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
      return { ...r, avg_rating: avg, reviews_count: ratings.length }
    })
    .sort((a, b) => b.avg_rating - a.avg_rating)

  return NextResponse.json(sorted)
}
