import { type NextRequest } from 'next/server'
import { handleGetCategories } from '@/src/controllers/category.controller'

export async function GET(request: NextRequest) {
  return handleGetCategories(request)
}
