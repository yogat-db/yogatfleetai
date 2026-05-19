import { NextResponse } from 'next/server';
import { STRIPE_PLANS, getPublicStripePlans } from '@/lib/stripe/plans';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET() {
  try {
    const missingConfig = Object.values(STRIPE_PLANS).some((plan) => !plan.priceId);

    if (missingConfig) {
      console.error('Missing Stripe price IDs');
      return jsonError(
        'Subscription plans are not configured. Please contact support.',
        500
      );
    }

    return NextResponse.json({
      success: true,
      data: getPublicStripePlans(),
    });
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
    return jsonError('Internal server error', 500);
  }
}