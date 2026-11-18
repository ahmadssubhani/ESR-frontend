import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('tags')
    .eq('id', restaurantId)
    .single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('tags')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)

  const tagCount: Record<string, number> = {}

  for (const tag of restaurant?.tags || []) {
    tagCount[tag] = (tagCount[tag] || 0) + 1
  }

  for (const review of reviews || []) {
    for (const tag of review.tags || []) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }
  }

  const tags = Object.entries(tagCount).map(([name, no_of_times_used]) => ({ name, no_of_times_used }))
    .sort((a, b) => b.no_of_times_used - a.no_of_times_used)

  return NextResponse.json(tags)
}
