import { NextRequest, NextResponse } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid profile details.' }, { status: 400 })
  }
  const values = body as Record<string, unknown>
  const full_name = typeof values.full_name === 'string' ? values.full_name.trim() : ''
  const phone = typeof values.phone === 'string' ? values.phone.trim() : ''
  const avatar_url = typeof values.avatar_url === 'string' ? values.avatar_url : null

  if (full_name.length < 1 || full_name.length > 120 || phone.length > 32) {
    return NextResponse.json({ error: 'Enter a name and a valid phone number.' }, { status: 400 })
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name },
  })
  if (metadataError) {
    return NextResponse.json({ error: metadataError.message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone: phone || null,
      avatar_url,
      image_url: avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
