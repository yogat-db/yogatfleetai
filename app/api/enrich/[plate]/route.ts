import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { plate: string } }
) {
  const plate = params.plate.toUpperCase().replace(/\s+/g, '')

  if (!plate || plate.length < 2) {
    return NextResponse.json(
      { success: false, error: 'Invalid registration format' },
      { status: 400 }
    )
  }

  // If in development and no DVLA key, use mock
  if (process.env.NODE_ENV === 'development' && !process.env.DVLA_API_KEY) {
    console.warn('Using mock DVLA data – set DVLA_API_KEY for production')
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
    // 1. Call DVLA Vehicle Enquiry API
    const dvlaResponse = await fetch(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.DVLA_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plate }),
      }
    )

    if (dvlaResponse.status === 404) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found. Please check the registration or enter details manually.' },
        { status: 200 }
      )
    }

    if (!dvlaResponse.ok) {
      const errorText = await dvlaResponse.text()
      console.error('DVLA API error:', dvlaResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: `DVLA lookup failed: ${dvlaResponse.status}` },
        { status: dvlaResponse.status }
      )
    }

    const dvlaData = await dvlaResponse.json()

    // 2. Fetch MOT data from your dedicated MOT endpoint
    let motData = null
    try {
      const motResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mot/${plate}`
      )
      if (motResponse.ok) {
        const motResult = await motResponse.json()
        motData = motResult.mot || null
      } else {
        console.warn('MOT fetch failed, proceeding without MOT data')
      }
    } catch (motError) {
      console.warn('MOT fetch error:', motError)
    }

    return NextResponse.json({
      success: true,
      dvla: {
        make: dvlaData.make,
        model: dvlaData.model,
        yearOfManufacture: dvlaData.yearOfManufacture,
        fuelType: dvlaData.fuelType,
        engineSize: dvlaData.engineSize,
      },
      mot: motData,
    })
  } catch (error: any) {
    console.error('Enrich API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}