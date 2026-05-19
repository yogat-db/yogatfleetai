import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type DiagnoseBody = {
  code: string;
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
  } | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as DiagnoseBody;
    const code = body?.code?.trim();
    const vehicle = body?.vehicle;

    if (!code) {
      return NextResponse.json(
        { error: 'DTC code is required' },
        { status: 400 }
      );
    }

    const vehicleText =
      vehicle && (vehicle.make || vehicle.model || vehicle.year)
        ? ` for a ${vehicle.make ?? ''} ${vehicle.model ?? ''} ${
            vehicle.year ? `(${vehicle.year})` : ''
          }`.trim()
        : '';

    const prompt = `
You are an automotive diagnostic expert. Explain the OBD2 trouble code ${code}${vehicleText}.

Provide the response as a JSON object with the following fields:
- description: a brief description of the code
- causes: an array of common causes
- fix: step-by-step repair instructions
- estimatedCost: estimated repair cost in GBP (as a number) or null if unknown
- mechanicNeeded: boolean indicating if a professional mechanic is likely required

Return only valid JSON, no extra text.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: { type: 'json_object' }, // JSON mode
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful automotive diagnostic assistant that always responds with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    // response_format=json_object guarantees JSON, so this parse should succeed
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('AI diagnose error:', err);
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}