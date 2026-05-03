// app/api/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedUser(req: NextRequest) {
  // Try cookie auth first
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) return user;

  // Fallback to Authorization header (if you ever need it)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
    return tokenUser;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, due_date, due_mileage, vehicle_id, notes } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      title: title.trim(),
      due_date: due_date || null,
      due_mileage: due_mileage ? parseInt(due_mileage) : null,
      vehicle_id: vehicle_id || null,
      notes: notes?.trim() || null,
      completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('POST reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}