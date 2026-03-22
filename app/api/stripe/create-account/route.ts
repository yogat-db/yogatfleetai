import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if mechanic already has a Stripe account
    const { data: existing } = await supabase
      .from('mechanics')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (existing?.stripe_account_id) {
      // Return onboarding link to finish setup
      const accountLink = await stripe.accountLinks.create({
        account: existing.stripe_account_id,
        refresh_url: `${req.headers.get('origin')}/marketplace/mechanics/dashboard`,
        return_url: `${req.headers.get('origin')}/marketplace/mechanics/dashboard`,
        type: 'account_onboarding',
      });
      return NextResponse.json({ url: accountLink.url });
    }

    // Create new Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email,
      capabilities: { transfers: { requested: true } },
    });

    await supabase
      .from('mechanics')
      .update({ stripe_account_id: account.id })
      .eq('user_id', user.id);

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin')}/marketplace/mechanics/dashboard`,
      return_url: `${req.headers.get('origin')}/marketplace/mechanics/dashboard`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Stripe create account error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}