import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const requestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message is too long'),
});

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      error: null,
      data,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
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
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Validation failed', 400, parsed.error.flatten());
    }

    const { message } = parsed.data;

    const openai = getOpenAIClient();

    const systemPrompt = [
      'You are the AI customer support assistant for Yogat Fleet AI.',
      'Yogat Fleet AI helps users manage vehicles, diagnostics, servicing, breakdown support, fleet operations, and mechanic marketplace activity.',
      'Answer clearly, briefly, and helpfully.',
      'Prefer practical next steps.',
      'If the user asks about account-specific actions you cannot verify, say what they should check in the app.',
      'Do not invent bookings, subscriptions, payments, diagnostics, or account data.',
    ].join(' ');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'Sorry, I could not generate a response right now.';

    return jsonSuccess({
      reply,
      requestId,
    });
  } catch (error) {
    console.error('[AI_SUPPORT_ERROR]', {
      requestId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    if (error instanceof OpenAI.APIError) {
      return jsonError(
        'AI service error',
        error.status ?? 502,
        {
          requestId,
          type: error.type ?? null,
          code: error.code ?? null,
        }
      );
    }

    if (error instanceof Error && error.message === 'Missing OPENAI_API_KEY') {
      return jsonError('Server configuration error', 500, { requestId });
    }

    return jsonError('Internal server error', 500, { requestId });
  }
}