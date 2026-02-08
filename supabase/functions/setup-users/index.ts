import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, email, password, name } = await req.json();

    if (action === 'setup') {
      const coupleId = '00000000-0000-0000-0000-000000000001';

      // Create users
      const users = [
        { email: 'fawwaz@ourjourney.app', password: password || 'fawwaz123', name: 'Fawwaz' },
        { email: 'anggun@ourjourney.app', password: password || 'anggun123', name: 'Anggun' },
      ];

      const results = [];

      for (const u of users) {
        // Check if user exists
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
        const found = existing?.users?.find(usr => usr.email === u.email);

        let userId: string;
        if (found) {
          userId = found.id;
          results.push({ email: u.email, status: 'exists' });
        } else {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
          });
          if (error) {
            results.push({ email: u.email, status: 'error', error: error.message });
            continue;
          }
          userId = data.user.id;
          results.push({ email: u.email, status: 'created' });
        }

        // Ensure profile exists
        const { data: profileExists } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileExists) {
          await supabaseAdmin.from('profiles').insert({
            user_id: userId,
            couple_id: coupleId,
            name: u.name,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
