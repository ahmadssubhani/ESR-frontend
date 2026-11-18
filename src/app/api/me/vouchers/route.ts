import { NextRequest } from 'next/server'
import { createClient, getApiUser } from '@/lib/supabase/server'
import { jsonApi } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return jsonApi(request, null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await getApiUser(supabase)
  if (!user) {
    return jsonApi(request, { error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const { data, error } = await supabase
    .from('user_coupons')
    .select(
      `id, used_at, coupon_id, offer_id, offers(id, name, image_url, valid_till, restaurants(id, name, cover_url))`
    )
    .eq('user_id', user.id)
    .order('used_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return jsonApi(request, { error: error.message }, { status: 500 })
  }
  return jsonApi(request, data)
}
