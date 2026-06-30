import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type { Category } from '@/src/types/category'

export async function getAllCategories(
  supabase: SupabaseServerClient,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Category[]
}
