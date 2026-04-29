'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  Car,
  MapPin,
  PoundSterling,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type JobVehicle = {
  make: string | null;
  model: string | null;
  license_plate: string | null;
};

interface Job {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string;
  location: string | null;
  user_id: string;
  created_at: string;
  vehicle: JobVehicle | null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function formatBudget(budget: number | null) {
  if (budget == null || Number.isNaN(Number(budget))) return 'TBD';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(budget);
}

function truncate(text: string | null | undefined, length = 140) {
  if (!text) return 'No description provided.';
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

export default function JobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMechanic, setIsMechanic] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user?.id) {
        router.replace('/login');
        return;
      }

      const [mechanicResponse, jobsResponse] = await Promise.all([
        supabase
          .from('mechanics')
          .select('id, verified')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('jobs')
          .select(
            'id, title, description, budget, status, location, user_id, created_at, vehicle:vehicles(make, model, license_plate)'
          )
          .eq('status', 'open')
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (mechanicResponse.error) {
        throw mechanicResponse.error;
      }

      if (jobsResponse.error) {
        throw jobsResponse.error;
      }

      if (!mechanicResponse.data) {
        setIsMechanic(false);
        setJobs([]);
        return;
      }

      setIsMechanic(true);
      setJobs((jobsResponse.data ?? []) as unknown as Job[]);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setIsMechanic(false);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (isMechanic === false) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-white/10 bg-slate-950 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <AlertCircle size={28} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Mechanic access required
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            To view and apply for repair jobs, you need to register your business as a mechanic first.
          </p>

          <button
            type="button"
            onClick={() => router.push('/marketplace/mechanics/register')}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.98]"
          >
            Start mechanic registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Available jobs
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Find repair opportunities in your area and grow your business.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {jobs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950 px-6 py-14 text-center"
          >
            <Briefcase size={44} className="mb-4 text-slate-500" />
            <h2 className="text-xl font-semibold text-white">No open jobs right now</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Check back soon — new repair opportunities appear throughout the day.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job, index) => (
              <motion.article
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.22 }}
                className="group flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl shadow-black/10 transition hover:border-white/20 hover:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <Briefcase size={18} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-white">
                      {job.title}
                    </h2>

                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(job.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {truncate(job.description)}
                </p>

                <div className="mt-5 grid gap-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <PoundSterling size={14} className="text-emerald-300" />
                    <span>Est. {formatBudget(job.budget)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-300" />
                    <span>{job.location || 'Remote / TBD'}</span>
                  </div>

                  {job.vehicle ? (
                    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                      <Car size={14} className="text-emerald-300" />
                      <span className="truncate">
                        {job.vehicle.make || 'Vehicle'} {job.vehicle.model || ''}
                        {job.vehicle.license_plate ? ` • ${job.vehicle.license_plate}` : ''}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    onClick={() => router.push(`/marketplace/jobs/${job.id}/apply`)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.98]"
                  >
                    View and apply
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-xl bg-white/5" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl shadow-black/10"
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10" />
              <div className="flex-1">
                <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-white/5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-white/5" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-white/5" />
            </div>

            <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}