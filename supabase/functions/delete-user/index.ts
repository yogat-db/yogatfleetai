// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// If using Algolia:
// import algoliasearch from 'https://esm.sh/algoliasearch';

interface DeleteUserPayload {
  userId: string; // The UUID of the user to delete
}

serve(async (req) => {
  try {
    // 1. Verify authentication (optional but recommended)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    // 2. Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 3. Optionally, verify that the request comes from an authenticated user with admin privileges
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
    // Check if user has admin role (adjust as needed)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403 });
    }

    // 4. Parse request body
    const { userId }: DeleteUserPayload = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 });
    }

    // 5. Delete user from Supabase Auth (this will also trigger cascading deletes if set up)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Auth deletion error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user from auth' }), { status: 500 });
    }

    // 6. Delete user from external search index (if applicable)
    // Example with Algolia:
    /*
    const algoliaClient = algoliasearch(
      Deno.env.get('ALGOLIA_APP_ID')!,
      Deno.env.get('ALGOLIA_ADMIN_API_KEY')!
    );
    const index = algoliaClient.initIndex('users');
    await index.deleteObject(userId);
    */

    // 7. Return success response
    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});