import { NextRequest, NextResponse } from 'next/server'
import { createClient , getApiUser } from '@/lib/supabase/server'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('user_offers')
    .delete()
    .eq('user_id', user.id)
    .eq('offer_id', offerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ message: 'Removed from favourites' })
}
