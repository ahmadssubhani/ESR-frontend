import { createClient } from '@/lib/supabase/server'
import AdsAdmin, { type Ad } from '@/components/admin/AdsAdmin'

export default async function AdsPage() {
  const supabase = await createClient()
  const { data: ads } = await supabase.from('admin_ads').select('*').order('created_at', { ascending: false })
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Banner Ads</h1>
      <AdsAdmin ads={(ads || []) as Ad[]} />
    </div>
  )
}
