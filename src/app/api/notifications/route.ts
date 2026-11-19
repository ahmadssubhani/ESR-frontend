import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await getApiUser(supabase)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
  if (!user) return NextResponse.json({ error: 'Sign in to view notifications.' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, entity_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(full_name)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await getApiUser(supabase)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
  if (!user) return NextResponse.json({ error: 'Sign in to update notifications.' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'A notification id is required.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('recipient_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
