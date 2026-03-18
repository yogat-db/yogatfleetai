import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    // Parse request body
    const { code, vehicle } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'DTC code is required' }, { status: 400 })
    }

    // Build a detailed prompt
    const prompt = `
You are an expert automotive diagnostic assistant. Provide a detailed analysis for the OBD2 trouble code "${code}"${vehicle ? ` for a ${vehicle.make} ${vehicle.model} (${vehicle.year})` : ''}.

Return a valid JSON object with the following structure:
{
  "code": "string",
  "description": "string",
  "causes": ["string", ...],
  "fix": "string (step‑by‑step instructions)",
  "estimatedCost": number | null,
  "mechanicNeeded": boolean
}

Do not include any other text, only the JSON object.
`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // or 'gpt-3.5-turbo' for lower cost
      messages: [
        { role: 'system', content: 'You are a helpful automotive diagnostic assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    // Parse the JSON response
    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json({ error: 'Invalid response from AI' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('OpenAI diagnostic error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}