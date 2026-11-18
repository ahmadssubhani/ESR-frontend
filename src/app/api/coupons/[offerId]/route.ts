import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient , getApiUser } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('offer_id', offerId)
    .eq('active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await getApiUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('coupons')
    .insert({ offer_id: offerId, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
