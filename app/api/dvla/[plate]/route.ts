import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { plate: string } }
) {
  const plate = params.plate.toUpperCase().replace(/\s+/g, '')

  // Basic validation
  if (!plate || plate.length < 2) {
    return NextResponse.json(
      { success: false, error: 'Invalid registration format' },
      { status: 400 }
    )
  }

  // In development, return mock data
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
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
    })
  }

  try {
    // Real API call (replace with your actual provider)
    const apiKey = process.env.DVLA_API_KEY
    if (!apiKey) {
      throw new Error('DVLA_API_KEY not configured')
    }

    const response = await fetch(
      `https://your-dvla-provider.com/vehicle/${plate}`,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('DVLA API returned an error')
    }

    const data = await response.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    console.error('DVLA lookup error:', error)
    // Return a user-friendly error
    return NextResponse.json(
      { success: false, error: 'Lookup failed. Please try again.' },
      { status: 500 }
    )
  }
}