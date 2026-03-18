import { NextResponse } from 'next/server'
import { getDTCInfo } from '@/lib/ai/diagnostics'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Await the params Promise first
    const { code } = await params

    // Now you can safely use 'code'
    if (!code || code.length < 4) {
      return NextResponse.json({ error: 'Invalid DTC code' }, { status: 400 })
    }

    const info = getDTCInfo(code)
    if (!info) {
      return NextResponse.json({ error: 'DTC code not found' }, { status: 404 })
    }

    return NextResponse.json(info)
  } catch (err: any) {
    console.error('DTC lookup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}