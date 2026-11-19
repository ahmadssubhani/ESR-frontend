import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const profile = profileData as { role: string; full_name: string | null } | null
  if (!profile || !['admin', 'restaurant'].includes(profile.role)) redirect('/user/offers')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar role={profile.role} name={profile.full_name || 'Admin'} />
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
