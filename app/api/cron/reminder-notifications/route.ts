import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Mailtrap SMTP configuration (use your credentials from Mailtrap)
const transporter = nodemailer.createTransport({
  host: 'live.smtp.mailtrap.io',
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.MAILTRAP_SMTP_USER, // e.g., "api" or your username
    pass: process.env.MAILTRAP_SMTP_PASSWORD, // your Mailtrap password / API token
  },
});

export async function GET() {
  try {
    const supabase = await createClient();

    // Get reminders due in the next 7 days (or today)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('id, title, due_date, due_mileage, vehicle_id, user_id')
      .eq('completed', false)
      .lte('due_date', nextWeek)
      .gte('due_date', today);

    if (error) throw error;

    let sentCount = 0;

    for (const reminder of reminders) {
      // Fetch user email using supabaseAdmin (service role)
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(reminder.user_id);
      if (userError || !user.user?.email) continue;

      // Fetch vehicle details (optional)
      let vehicleInfo = '';
      if (reminder.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('make, model, license_plate')
          .eq('id', reminder.vehicle_id)
          .single();
        if (vehicle) {
          vehicleInfo = `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`;
        }
      }

      const dueInfo = reminder.due_date
        ? `on ${new Date(reminder.due_date).toLocaleDateString()}`
        : reminder.due_mileage
        ? `at ${reminder.due_mileage.toLocaleString()} mi`
        : 'soon';

      const subject = `Reminder: ${reminder.title} due soon`;
      const html = `<p>Your service reminder for ${vehicleInfo || 'your vehicle'}: <strong>${reminder.title}</strong> is due ${dueInfo}.</p>
                     <p><a href="https://yogatfleetai.com/service-reminders">View your reminders</a></p>`;

      await transporter.sendMail({
        from: 'Yogat Fleet AI <noreply@yogatfleetai.com>',
        to: user.user.email,
        subject,
        html,
      });

      sentCount++;
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}