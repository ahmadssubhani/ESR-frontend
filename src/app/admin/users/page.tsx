import { createClient } from '@/lib/supabase/server'
import UsersAdmin from '@/components/admin/UsersAdmin'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase.from('profiles').select('*, restaurants(id, name)').order('created_at', { ascending: false })
  const { data: restaurants } = await supabase.from('restaurants').select('id, name').order('name')

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Users</h1>
      <UsersAdmin users={(users || []) as Record<string, unknown>[]} restaurants={(restaurants || []) as { id: string; name: string }[]} />
    </div>
  )
}
