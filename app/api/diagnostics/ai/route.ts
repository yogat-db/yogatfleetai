import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, vehicle } = await req.json()
    if (!code) {
      return NextResponse.json({ error: 'DTC code is required' }, { status: 400 })
    }

    const prompt = `
You are an automotive diagnostic expert. Explain the OBD2 trouble code ${code}${vehicle ? ` for a ${vehicle.make} ${vehicle.model} (${vehicle.year})` : ''}.

Provide the response as a JSON object with the following fields:
- description: a brief description of the code
- causes: an array of common causes
- fix: step‑by‑step repair instructions
- estimatedCost: estimated repair cost in GBP (as a number) or null if unknown
- mechanicNeeded: boolean indicating if a professional mechanic is likely required

Return only valid JSON, no extra text.
    `

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful automotive diagnostic assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI returned empty response')

    const result = JSON.parse(content)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('AI diagnose error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}