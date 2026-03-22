import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Briefcase, Eye, DollarSign } from 'lucide-react';
import { deleteJob, releasePayment } from './actions';          // local server actions
import DeleteJobButton from './DeleteJobButton';                 // local client component
import styles from './page.module.css';                          // local CSS module

type Job = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: string;
  payment_status: string | null;
  payment_intent_id: string | null;
  created_at: string;
  user_id: string;
  vehicle_id: string | null;
  user_email?: string;
  vehicle?: { license_plate: string; make: string; model: string } | null;
};

export const metadata = {
  title: 'Jobs Management | Admin',
  description: 'Manage all repair jobs',
};

export default async function AdminJobsPage() {
  try {
    // Fetch jobs
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobsError) throw new Error(jobsError.message);

    // Collect unique user and vehicle IDs
    const userIds = [...new Set(jobs?.map(j => j.user_id).filter(Boolean) || [])];
    const vehicleIds = [...new Set(jobs?.map(j => j.vehicle_id).filter(Boolean) || [])];

    // Fetch user emails
    let userEmails: Record<string, string> = {};
    if (userIds.length) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      if (users) {
        userEmails = users.users.reduce((acc, u) => {
          acc[u.id] = u.email || '';
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Fetch vehicle details
    let vehicles: Record<string, any> = {};
    if (vehicleIds.length) {
      const { data: vehicleData } = await supabaseAdmin
        .from('vehicles')
        .select('id, license_plate, make, model')
        .in('id', vehicleIds);
      if (vehicleData) {
        vehicles = vehicleData.reduce((acc, v) => {
          acc[v.id] = { license_plate: v.license_plate, make: v.make, model: v.model };
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Enrich jobs with user email and vehicle
    const enrichedJobs: Job[] = (jobs || []).map(job => ({
      ...job,
      user_email: userEmails[job.user_id] || 'Unknown',
      vehicle: job.vehicle_id ? vehicles[job.vehicle_id] : null,
    }));

    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Jobs Management</h1>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Payment Status</th>
                <th>Posted By</th>
                <th>Vehicle</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className={styles.titleCell}>
                      <Briefcase size={16} color="#64748b" />
                      {job.title}
                    </div>
                  </td>
                  <td>£{job.budget?.toFixed(2) ?? '—'}</td>
                  <td>
                    <span style={getStatusStyle(job.status)}>{job.status}</span>
                  </td>
                  <td>
                    <span style={getPaymentStatusStyle(job.payment_status)}>
                      {job.payment_status || '—'}
                    </span>
                  </td>
                  <td>{job.user_email}</td>
                  <td>
                    {job.vehicle
                      ? `${job.vehicle.make} ${job.vehicle.model} (${job.vehicle.license_plate})`
                      : '—'}
                  </td>
                  <td>{new Date(job.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Link href={`/marketplace/jobs/${job.id}`} className={styles.viewButton}>
                        <Eye size={16} />
                      </Link>
                      {job.payment_status === 'pending' && job.payment_intent_id && (
                        <form action={releasePayment}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="paymentIntentId" value={job.payment_intent_id} />
                          <button type="submit" className={styles.releaseButton} title="Release Payment">
                            <DollarSign size={16} />
                          </button>
                        </form>
                      )}
                      <DeleteJobButton jobId={job.id} deleteAction={deleteJob} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (err) {
    console.error(err);
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Jobs Management</h1>
        <div className={styles.errorMessage}>Failed to load jobs. Please try again.</div>
      </div>
    );
  }
}

// Helper style functions (same as before)
const getStatusStyle = (status: string) => ({
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 500,
  textTransform: 'capitalize' as const,
  background:
    status === 'open' ? '#22c55e20' :
    status === 'assigned' ? '#3b82f620' :
    status === 'completed' ? '#64748b20' : '#ef444420',
  color:
    status === 'open' ? '#22c55e' :
    status === 'assigned' ? '#3b82f6' :
    status === 'completed' ? '#64748b' : '#ef4444',
});

const getPaymentStatusStyle = (status: string | null) => ({
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 500,
  background: status === 'pending' ? '#f59e0b20' : status === 'captured' ? '#22c55e20' : '#64748b20',
  color: status === 'pending' ? '#f59e0b' : status === 'captured' ? '#22c55e' : '#64748b',
});
