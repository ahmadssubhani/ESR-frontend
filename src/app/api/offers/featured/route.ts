import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('offers')
    .select(`*, restaurants!inner(id, name, lat, lng, cover_url, logo_url, categories(name))`)
    .eq('approval_status', true)
    .eq('is_redeemable', true)
    .eq('restaurants.is_featured', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
