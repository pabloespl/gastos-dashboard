import * as CategoryModel from '@/src/models/category.model'
import type { Category } from '@/src/types/category'

export async function getAllCategories(): Promise<Category[]> {
  return CategoryModel.getAllCategories()
}
