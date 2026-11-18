import { createClient } from '@/lib/supabase/server'
import RestaurantForm from '@/components/admin/RestaurantForm'

export default async function NewRestaurantPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Add Restaurant</h1>
      <RestaurantForm restaurant={null} categories={categories || []} />
    </div>
  )
}
