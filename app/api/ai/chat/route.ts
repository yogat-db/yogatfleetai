import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Prepare conversation history
    const messages = [
      {
        role: 'system',
        content: `You are a helpful customer support assistant for Yogat Fleet AI, a fleet management platform. 
Answer user questions about the platform, features, pricing, troubleshooting, etc. 
If you cannot answer, suggest contacting admin at support@yogat.com. Keep answers concise and friendly.`,
      },
      ...(history || []),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // or 'gpt-4' if you have access
      messages,
      temperature: 0.7,
      max_tokens: 300,
    })

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

