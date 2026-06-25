import { NextRequest, NextResponse } from 'next/server'
import * as CategoryService from '@/src/services/category.service'

export async function handleGetCategories(
  _request: NextRequest,
): Promise<NextResponse> {
  try {
    const categories = await CategoryService.getAllCategories()
    return NextResponse.json(categories)
  } catch (err) {
    console.error('[categories] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
