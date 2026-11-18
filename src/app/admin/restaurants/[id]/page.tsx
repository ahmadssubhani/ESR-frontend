import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RestaurantForm from '@/components/admin/RestaurantForm'

export default async function EditRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isNew = id === 'new'
  const supabase = await createClient()

  const [{ data: categories }, restaurantResult] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    isNew ? { data: null } : supabase.from('restaurants').select('*').eq('id', id).single(),
  ])

  if (!isNew && !restaurantResult.data) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">{isNew ? 'Add Restaurant' : 'Edit Restaurant'}</h1>
      <RestaurantForm restaurant={restaurantResult?.data || null} categories={categories || []} />
    </div>
  )
}
