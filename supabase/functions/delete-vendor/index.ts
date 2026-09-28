import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403);
    }

    const { vendor_id: vendorId } = await req.json();
    if (!vendorId || typeof vendorId !== 'string') {
      return json({ error: 'vendor_id is required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    await admin.from('vendor_menu_items').delete().eq('vendor_id', vendorId);

    const { error: deleteError } = await admin.from('vendors').delete().eq('id', vendorId);
    if (!deleteError) {
      return json({ outcome: 'deleted' });
    }

    if (deleteError.code === '23503') {
      const { error: archiveError } = await admin
        .from('vendors')
        .update({ status: 'suspended', is_open: false })
        .eq('id', vendorId);
      if (archiveError) {
        return json({ error: archiveError.message }, 500);
      }
      return json({ outcome: 'archived' });
    }

    return json({ error: deleteError.message }, 500);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
