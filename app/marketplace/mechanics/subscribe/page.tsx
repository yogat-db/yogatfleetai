'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe/client';

type SubscriptionPlan = {
  id: 'basic' | 'pro';
  name: string;
  price: number;
  interval: 'month';
  featured?: boolean;
  features: string[];
};

type MechanicProfile = {
  id: string;
};

export default function MechanicSubscribePage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<'basic' | 'pro'>('pro');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingMechanic, setLoadingMechanic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans();
    void loadMechanic();
  }, []);

  async function loadPlans() {
    try {
      setLoadingPlans(true);
      setError(null);

      const response = await fetch('/api/stripe/subscription-plans', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to load subscription plans');
      }

      setPlans(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  }

  async function loadMechanic() {
    try {
      setLoadingMechanic(true);

      const response = await fetch('/api/mechanics/me', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load mechanic profile');
      }

      if (!result?.data?.id) {
        throw new Error('Mechanic profile not found');
      }

      setMechanic({ id: result.data.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mechanic');
    } finally {
      setLoadingMechanic(false);
    }
  }

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  async function handleSubscribe() {
    try {
      setSubmitting(true);
      setError(null);

      if (!mechanic?.id) {
        throw new Error('Mechanic profile is missing');
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          mechanicId: mechanic.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success || !result?.url) {
        throw new Error(result?.error || 'Failed to create checkout session');
      }

      await getStripe();
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
      setSubmitting(false);
    }
  }

  if (loadingPlans || loadingMechanic) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Choose a plan</h1>
        <p className="mt-3 text-sm text-gray-600">Loading subscription options…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Choose a plan</h1>
        <p className="mt-2 text-sm text-gray-600">
          Start your mechanic subscription and continue to secure checkout.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={[
                'rounded-xl border p-5 text-left transition',
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-black hover:border-gray-400',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className={isSelected ? 'text-gray-200' : 'text-gray-600'}>
                    £{plan.price}/{plan.interval}
                  </p>
                </div>

                {plan.featured ? (
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-xs font-medium',
                      isSelected ? 'bg-white text-black' : 'bg-black text-white',
                    ].join(' ')}
                  >
                    Popular
                  </span>
                ) : null}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={isSelected ? 'text-sm text-gray-100' : 'text-sm text-gray-700'}
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <p className="text-sm text-gray-600">Selected plan</p>
          <p className="text-lg font-semibold">
            {selectedPlan ? `${selectedPlan.name} — £${selectedPlan.price}/${selectedPlan.interval}` : 'None'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={submitting || !selectedPlan || !mechanic?.id}
          className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Redirecting…' : 'Continue to checkout'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="mt-4 text-sm text-gray-600 underline underline-offset-4"
      >
        Go back
      </button>
    </main>
  );
}