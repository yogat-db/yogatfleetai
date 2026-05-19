import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const requestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
});

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      error: null,
      data,
    },
    { status }
  );
}

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error,
      data: null,
      details: details ?? null,
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI_SUPPORT] Missing OPENAI_API_KEY');
      return jsonError('Server configuration error', 500);
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Validation failed', 400, parsed.error.flatten());
    }

    const { message } = parsed.data;

    const systemPrompt =
      'You are an AI support assistant for Yogat Fleet AI, a fleet management platform that helps users manage vehicles, diagnostics, breakdown cover, and connect with mechanics. Answer questions helpfully and concisely.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'Sorry, I could not generate a response.';

    return jsonSuccess({ reply });
  } catch (error) {
    console.error('[AI_SUPPORT_ERROR]', error);

    if (error instanceof OpenAI.APIError) {
      return jsonError(
        'AI service error',
        error.status ?? 502,
        {
          type: error.type,
          code: error.code,
        }
      );
    }

    return jsonError('Internal server error', 500);
  }
}