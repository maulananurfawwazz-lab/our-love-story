// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    // Masked debug logging for troubleshooting auth/upload issues
    const authHeader = req.headers.get('authorization');
    const apikeyHeader = req.headers.get('apikey');
    console.log('[fetch-playlist-cover] auth_prefix:', authHeader ? authHeader.slice(0, 8) + '...' : null, 'auth_len:', authHeader?.length ?? 0);
    console.log('[fetch-playlist-cover] apikey_prefix:', apikeyHeader ? apikeyHeader.slice(0, 8) + '...' : null);
    // Support both APP_SERVICE_ROLE_KEY (custom) and SUPABASE_SERVICE_ROLE_KEY (default)
    const serviceRoleKeyPresent = !!Deno.env.get('APP_SERVICE_ROLE_KEY') || !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceRoleEnv = Deno.env.get('APP_SERVICE_ROLE_KEY') ? 'APP_SERVICE_ROLE_KEY' : (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SUPABASE_SERVICE_ROLE_KEY' : null);
    console.log('[fetch-playlist-cover] service_role_key_present:', serviceRoleKeyPresent, 'service_role_env:', serviceRoleEnv);
  } catch (e: any) {
    console.debug('[fetch-playlist-cover] debug log failed', e?.message ?? e);
  }

  try {
    const { url, couple_id, playlist_id } = await req.json();
    if (!url || !couple_id) return new Response(JSON.stringify({ error: 'url and couple_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Prefer APP_SERVICE_ROLE_KEY if provided, fall back to SUPABASE_SERVICE_ROLE_KEY
    const serviceRole = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, serviceRole!);

    // If playlist_id was provided, validate it belongs to the couple
    if (playlist_id) {
      try {
        const { data: plRow, error: plErr } = await supabaseAdmin.from('playlists').select('id,couple_id').eq('id', playlist_id).maybeSingle();
        if (plErr) return new Response(JSON.stringify({ error: 'playlist_lookup_failed', details: plErr }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (!plRow) return new Response(JSON.stringify({ error: 'playlist_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (plRow.couple_id !== couple_id) return new Response(JSON.stringify({ error: 'playlist_couple_mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'playlist_validation_error', details: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // helper: fetch with retries/backoff for transient errors (with jitter)
    async function fetchWithRetries(url: string, attempts = 4, delayMs = 500) {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return res;
          const status = res.status;
          if (status >= 500 || status === 429) {
            const jitter = Math.floor(Math.random() * 200);
            const wait = delayMs * Math.pow(2, i) + jitter;
            console.warn(`fetch ${url} failed status ${status}, retrying in ${wait}ms (attempt ${i + 1})`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          return res;
        } catch (e) {
          const jitter = Math.floor(Math.random() * 200);
          const wait = delayMs * Math.pow(2, i) + jitter;
          console.warn(`fetch ${url} error, retrying in ${wait}ms (attempt ${i + 1})`, e);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      return null;
    }

    // 1) get oEmbed from Spotify (with retries)
    let thumbnail: string | undefined;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetchWithRetries(oembedUrl, 4, 500);
    if (!oembedRes) {
      console.warn('oembed failed after retries');
    } else if (!oembedRes.ok) {
      try {
        const bodyText = await oembedRes.text();
        console.warn('oembed failed', oembedRes.status, bodyText.slice(0, 1024));
      } catch (e) {
        console.warn('oembed failed', oembedRes.status);
      }
    } else {
      try {
        const oembed = await oembedRes.json();
        thumbnail = oembed.thumbnail_url as string | undefined;
      } catch (e) {
        console.warn('oembed parse error', e);
      }
    }

    // Fallback: if oEmbed didn't work, fetch the track page and parse og:image
    if (!thumbnail) {
      console.log('oembed did not yield thumbnail; attempting page fallback');
      try {
        const pageRes = await fetchWithRetries(url, 2, 500);
        if (pageRes && pageRes.ok) {
          const pageText = await pageRes.text();
          const m = pageText.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || pageText.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
          const fallback = m?.[1];
          if (fallback) {
            thumbnail = fallback;
            console.log('found fallback thumbnail from page');
          } else {
            console.warn('no og:image found on track page');
          }
        } else {
          console.warn('track page fetch failed', pageRes?.status);
        }
      } catch (e) {
        console.warn('fallback page fetch error', e);
      }
    }

    if (!thumbnail) return new Response(JSON.stringify({ error: 'oembed_failed', status: 504 }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // 2) download image bytes
    const imgRes = await fetch(thumbnail);
    if (!imgRes.ok) return new Response(JSON.stringify({ error: 'download_failed', status: imgRes.status }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const buf = new Uint8Array(await imgRes.arrayBuffer());

    // 3) build path and upload to couple-uploads
    const ext = (thumbnail.split('.').pop() || 'jpg').split('?')[0];
    const filePath = `playlists/${couple_id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from('couple-uploads').upload(filePath, buf, { upsert: true, contentType: imgRes.headers.get('content-type') || 'image/jpeg' });
    if (uploadErr) return new Response(JSON.stringify({ error: 'upload_failed', details: uploadErr }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // 4) get public url
    const { data } = supabaseAdmin.storage.from('couple-uploads').getPublicUrl(filePath);
    const publicUrl = data.publicUrl + `?v=${Date.now()}`;

    // 5) If playlist_id provided, update the playlist row's image_url
    if (playlist_id) {
      const { error: updErr } = await supabaseAdmin.from('playlists').update({ image_url: publicUrl }).eq('id', playlist_id).eq('couple_id', couple_id);
      if (updErr) {
        console.warn('failed to update playlist image_url', updErr);
        return new Response(JSON.stringify({ publicUrl, warning: 'update_failed', details: updErr }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ publicUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
