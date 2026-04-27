// app/admin/jobs/actions.ts
'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function assertAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/unauthorized');
  }
  return user;
}

export async function deleteJob(formData: FormData) {
  await assertAdmin();
  const jobId = formData.get('jobId') as string;
  if (!jobId) throw new Error('Job ID required');

  // Delete associated applications first (if foreign key doesn't cascade)
  await supabaseAdmin.from('applications').delete().eq('job_id', jobId);
  
  const { error } = await supabaseAdmin.from('jobs').delete().eq('id', jobId);
  if (error) throw new Error(`Failed to delete job: ${error.message}`);

  revalidatePath('/admin/jobs');
  redirect('/admin/jobs');
}

export async function releasePayment(formData: FormData) {
  await assertAdmin();
  const jobId = formData.get('jobId') as string;
  if (!jobId) throw new Error('Job ID required');

  const { error } = await supabaseAdmin
    .from('jobs')
    .update({ payment_status: 'released', status: 'completed' })
    .eq('id', jobId);
  if (error) throw new Error(`Failed to release payment: ${error.message}`);

  revalidatePath('/admin/jobs');
  redirect('/admin/jobs');
}