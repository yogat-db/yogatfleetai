import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function jsonError(error: string, status = 500, details?: unknown) {
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

function normalizeCode(code: string) {
  return code.replace(/\s+/g, '').toUpperCase();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonError('Missing OPENAI_API_KEY', 500);
    }

    const { code } = await params;
    const normalizedCode = normalizeCode(code);

    if (!normalizedCode) {
      return jsonError('Missing DTC code', 400);
    }

    const prompt = `
You are an automotive diagnostics assistant for Yogat Fleet AI.

A user scanned the OBD-II / DTC fault code: ${normalizedCode}

Return a JSON object only with this exact shape:
{
  "code": "string",
  "description": "string",
  "causes": ["string", "string"],
  "fix": "string",
  "estimatedCost": number|null,
  "mechanicNeeded": boolean,
  "severity": "low"|"medium"|"high",
  "nextSteps": ["string"],
  "summaryForMechanic": "string"
}

Rules:
- Give practical and realistic automotive guidance.
- causes must always be an array.
- nextSteps must always be an array.
- estimatedCost should be a rough GBP estimate if reasonable, otherwise null.
- mechanicNeeded should be true if the fault is safety-critical, engine-related, emissions-related, electrical, or likely requires tools/parts.
- summaryForMechanic should be concise and suitable for sending to a mechanic.
- Do not include markdown fences.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a vehicle diagnostics AI that returns structured JSON for a fleet maintenance app.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return jsonError('No diagnostic response generated', 502);
    }

    const parsed = JSON.parse(content);

    const data = {
      code: parsed?.code ?? normalizedCode,
      description:
        parsed?.description ?? `Diagnostic Trouble Code ${normalizedCode}`,
      causes: Array.isArray(parsed?.causes) ? parsed.causes : [],
      fix: parsed?.fix ?? 'Further inspection is recommended.',
      estimatedCost:
        typeof parsed?.estimatedCost === 'number' ? parsed.estimatedCost : null,
      mechanicNeeded: Boolean(parsed?.mechanicNeeded),
      severity:
        parsed?.severity === 'low' ||
        parsed?.severity === 'medium' ||
        parsed?.severity === 'high'
          ? parsed.severity
          : 'medium',
      nextSteps: Array.isArray(parsed?.nextSteps) ? parsed.nextSteps : [],
      summaryForMechanic:
        parsed?.summaryForMechanic ??
        `Customer reported DTC ${normalizedCode}. Further diagnostic inspection required.`,
    };

    return NextResponse.json({
      success: true,
      error: null,
      data,
    });
  } catch (err) {
    console.error('[DTC_LOOKUP_ERROR]', err);

    if (err instanceof OpenAI.APIError) {
      return jsonError('OpenAI service error', err.status ?? 502, {
        type: err.type,
        code: err.code,
      });
    }

    return jsonError(
      err instanceof Error ? err.message : 'Internal server error',
      500
    );
  }
}