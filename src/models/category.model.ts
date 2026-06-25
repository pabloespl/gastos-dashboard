import { createAdminClient } from '@/app/lib/supabase/admin'
import type { Category } from '@/src/types/category'

export async function getAllCategories(): Promise<Category[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Category[]
}
