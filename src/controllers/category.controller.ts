import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import * as CategoryService from '@/src/services/category.service'

export async function handleGetCategories(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const categories = await CategoryService.getAllCategories(supabase)
    return NextResponse.json(categories)
  } catch (err) {
    console.error('[categories] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
