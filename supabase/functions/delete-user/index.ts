import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller's JWT – ensures they can only delete their own account
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')

    // Create a Supabase client with the service role key (admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Ensure the user is deleting their own account
    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Delete user's data from all related tables (order matters for foreign keys)
    // Add/remove tables based on your schema
    const tables = [
      'user_preferences',
      'applications',
      'jobs',
      'service_events',
      'vehicles',
      'mechanics',
    ]

    for (const table of tables) {
      try {
        if (table === 'user_preferences' || table === 'mechanics' || table === 'jobs') {
          await supabaseAdmin.from(table).delete().eq('user_id', user_id)
        } else if (table === 'vehicles') {
          await supabaseAdmin.from(table).delete().eq('user_id', user_id)
        } else if (table === 'service_events') {
          // Delete via vehicles
          const { data: vehicles } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('user_id', user_id)
          if (vehicles) {
            const vehicleIds = vehicles.map(v => v.id)
            if (vehicleIds.length > 0) {
              await supabaseAdmin.from('service_events').delete().in('vehicle_id', vehicleIds)
            }
          }
        } else if (table === 'applications') {
          // Applications are linked to mechanics, not directly to user
          const { data: mechanic } = await supabaseAdmin
            .from('mechanics')
            .select('id')
            .eq('user_id', user_id)
            .maybeSingle()
          if (mechanic) {
            await supabaseAdmin.from('applications').delete().eq('mechanic_id', mechanic.id)
          }
        }
      } catch (err) {
        console.error(`Error deleting from ${table}:`, err)
        // Continue with next table
      }
    }

    // Finally, delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Delete user error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})