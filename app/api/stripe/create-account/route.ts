import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate – await the server client
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch the mechanic profile
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 404 });
    }

    // 3. If the mechanic already has a Stripe account, return an onboarding link
    if (mechanic.stripe_account_id) {
      const accountLink = await stripe.accountLinks.create({
        account: mechanic.stripe_account_id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?onboarding=complete`,
        type: 'account_onboarding',
      });
      return NextResponse.json({
        accountId: mechanic.stripe_account_id,
        onboardingUrl: accountLink.url,
        existing: true,
      });
    }

    // 4. Create a new Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '7538', // Automotive repair and maintenance
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
    });

    // 5. Store the account ID
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({ stripe_account_id: account.id })
      .eq('id', mechanic.id);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError);
      // Clean up Stripe account
      await stripe.accounts.del(account.id);
      return NextResponse.json(
        { error: 'Failed to save account information' },
        { status: 500 }
      );
    }

    // 6. Generate account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/mechanics/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (err: any) {
    console.error('Stripe Connect account creation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
}