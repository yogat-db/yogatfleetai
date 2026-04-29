// app/api/dtc/[code]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request, // prefixed with underscore to indicate unused
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Missing DTC code' }, { status: 400 });
    }

    // Here you would fetch DTC details from a database or external API
    // For now, return a mock response (replace with real logic)
    const dtcInfo = {
      code: code.toUpperCase(),
      description: `Diagnostic Trouble Code ${code.toUpperCase()} - Generic OBD2 fault`,
      possibleCauses: ['Faulty sensor', 'Wiring issue', 'Low fluid level'],
      severity: 'Medium',
    };

    return NextResponse.json(dtcInfo);
  } catch (err: any) {
    console.error('DTC lookup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}