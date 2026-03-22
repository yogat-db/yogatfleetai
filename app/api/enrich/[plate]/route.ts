import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mock enriched data – replace with real DVLA/MOT APIs
    const mockData = {
      success: true,
      dvla: {
        make: 'NISSAN',
        model: 'QASHQAI',
        yearOfManufacture: 2015,
        fuelType: 'PETROL',
        engineSize: 1598,
      },
      mot: {
        status: 'Valid',
        expiryDate: '2024-12-01',
      },
    }
    return NextResponse.json(mockData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}