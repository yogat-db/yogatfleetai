import { NextResponse } from 'next/server'
import { getDTCInfo } from '@/lib/ai/diagnostics'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalized = code.toUpperCase().trim()
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid DTC code' }, { status: 400 })
    }

    const info = getDTCInfo(normalized)
    if (!info) {
      return NextResponse.json({ error: 'DTC code not found' }, { status: 404 })
    }
    return NextResponse.json(info)
  } catch (err: any) {
    console.error('DTC lookup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}