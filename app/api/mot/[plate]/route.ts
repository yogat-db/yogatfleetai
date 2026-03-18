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

  const apiKey = process.env.MOT_API_KEY
  if (!apiKey) {
    console.error('MOT_API_KEY is not set in environment variables')
    return NextResponse.json(
      { success: false, error: 'MOT API not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${plate}`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    )

    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        mot: null,
        message: 'No MOT history found for this vehicle (may be new or exempt).',
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('MOT API error:', response.status, errorText)
      return NextResponse.json(
        { success: false, error: `MOT lookup failed: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // The API returns an array of MOT tests, most recent first
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: true,
        mot: null,
        message: 'No MOT history found.',
      })
    }

    // Extract the most recent test
    const latest = data[0]
    const motData = {
      status: latest.status || 'Valid',
      expiryDate: latest.expiryDate || null,
      testDate: latest.completedDate || null,
      odometer: latest.odometerValue || null,
      testResult: latest.testResult || null,
    }

    return NextResponse.json({
      success: true,
      mot: motData,
    })
  } catch (error: any) {
    console.error('MOT API fetch error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}