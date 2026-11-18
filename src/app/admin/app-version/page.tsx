import { createClient } from '@/lib/supabase/server'
import AppVersionAdmin from '@/components/admin/AppVersionAdmin'

export default async function AppVersionPage() {
  const supabase = await createClient()
  const { data: versions } = await supabase.from('application_versions').select('*').order('created_at', { ascending: false })
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">App Version Control</h1>
      <AppVersionAdmin versions={(versions || []) as Record<string, unknown>[]} />
    </div>
  )
}
