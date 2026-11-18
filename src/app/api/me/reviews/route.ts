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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `*, restaurants(id, name, cover_url), offers(name), review_images(image_url), review_likes(user_id)`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return jsonApi(request, { error: error.message }, { status: 500 })
  }
  return jsonApi(request, data)
}
