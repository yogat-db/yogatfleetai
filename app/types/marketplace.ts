// app/types/marketplace.ts
export type Job = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  user_id: string;
  vehicle_id: string | null;
  assigned_mechanic_id: string | null;
  created_at: string;
  updated_at: string;
};

export type JobStatus = Job['status'];

export type Mechanic = {
  id: string;
  user_id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  subscription_status: 'active' | 'inactive' | 'cancelled';
  stripe_account_id: string | null;
  created_at: string;
};

export type MechanicProfile = Mechanic;

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  features: string[];
};

export type Application = {
  id: string;
  job_id: string;
  mechanic_id: string;
  bid_amount: number | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

export type ApplicationStatus = Application['status'];