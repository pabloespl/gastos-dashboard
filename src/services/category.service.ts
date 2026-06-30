import * as CategoryModel from '@/src/models/category.model'
import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type { Category } from '@/src/types/category'

export async function getAllCategories(
  supabase: SupabaseServerClient,
): Promise<Category[]> {
  return CategoryModel.getAllCategories(supabase)
}
