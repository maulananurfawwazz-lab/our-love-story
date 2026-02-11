import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
// Prefer APP_SERVICE_ROLE_KEY if set (supports user's custom secret name), fall back to SUPABASE_SERVICE_ROLE_KEY
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Environment variables SUPABASE_URL and APP_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY are required');
  Deno.exit(1);
}

// Using Spotify oEmbed (no client credentials required)

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function processOne(playlist: any) {
  const { id, spotify_url: raw_spotify_url, couple_id } = playlist;
  const spotify_url = (raw_spotify_url ?? playlist?.url ?? '').toString().trim();
  console.log(`Processing ${id} - ${spotify_url}`);

  // Validate Spotify URL early to avoid sending non-URLs (e.g. accidentally-stored tokens)
  const spotifyUrlPattern = /^(https?:\/\/open\.spotify\.com\/track\/|spotify:track:)/i;
  if (!spotify_url || !spotifyUrlPattern.test(spotify_url)) {
    console.warn('invalid spotify url, skipping', spotify_url);
    return;
  }
  try {
    // helper: fetch with retries/backoff for transient errors
    async function fetchWithRetries(url: string, attempts = 6, delayMs = 500) {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return res;
          const status = res.status;
          // retry on 5xx or 429
          if (status >= 500 || status === 429) {
            const wait = delayMs * Math.pow(2, i);
            console.warn(`fetch ${url} failed status ${status}, retrying in ${wait}ms (attempt ${i + 1})`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          return res;
        } catch (e) {
          const wait = delayMs * Math.pow(2, i);
          console.warn(`fetch ${url} error, retrying in ${wait}ms (attempt ${i + 1})`, e);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      return null;
    }

    let thumbnail: string | undefined;
    const oembedRes = await fetchWithRetries(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotify_url)}`);
    if (!oembedRes) { console.warn('oembed failed after retries'); }
    else if (!oembedRes.ok) {
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

    // If oEmbed didn't yield a thumbnail, try fetching the track page and parsing og:image as a fallback
    if (!thumbnail) {
      console.log('oembed did not provide thumbnail, attempting page fallback');
      try {
        const pageRes = await fetchWithRetries(spotify_url, 3, 500);
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
        console.warn('fallback track page fetch error', e);
      }
    }

    if (!thumbnail) { console.warn('no thumbnail for', id); return; }

    const imgResWithRetry = await fetchWithRetries(thumbnail, 3, 300);
    const imgRes = imgResWithRetry ?? null;
    if (!imgRes) { console.warn('download failed after retries'); return; }
    if (!imgRes.ok) { console.warn('download failed', imgRes.status); return; }
    const buf = new Uint8Array(await imgRes.arrayBuffer());

    const ext = (thumbnail.split('.').pop() || 'jpg').split('?')[0];
    const filePath = `playlists/${couple_id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from('couple-uploads').upload(filePath, buf, { upsert: true, contentType: imgRes.headers.get('content-type') || 'image/jpeg' });
    if (uploadErr) { console.warn('upload failed', uploadErr); return; }

    const { data } = supabaseAdmin.storage.from('couple-uploads').getPublicUrl(filePath);
    const publicUrl = data.publicUrl + `?v=${Date.now()}`;

    const { error: updErr } = await supabaseAdmin.from('playlists').update({ image_url: publicUrl }).eq('id', id);
    if (updErr) { console.warn('update failed', updErr); return; }

    console.log(`Done ${id} -> ${publicUrl}`);
  } catch (err) {
    console.error('error processing', id, err);
  }
}

async function run() {
  const args = [...Deno.args];
  // CLI: --id <playlist_id>  OR  --file <path/to/json>
  const idIndex = args.indexOf('--id');
  const fileIndex = args.indexOf('--file');

  if (idIndex !== -1 && args[idIndex + 1]) {
    const id = args[idIndex + 1];
    console.log('Processing single playlist id:', id);
    const { data: row, error } = await supabaseAdmin.from('playlists').select('id,spotify_url,couple_id').eq('id', id).maybeSingle();
    if (error) { console.error('select error', error); return; }
    if (!row) { console.log('No playlist found with id', id); return; }
    await processOne(row);
    return;
  }

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const p = args[fileIndex + 1];
    console.log('Processing playlists from file:', p);
    try {
      const txt = await Deno.readTextFile(p);
      const list = JSON.parse(txt);
      if (!Array.isArray(list)) { console.error('File must contain JSON array of playlists'); return; }
      for (const pl of list) { await processOne(pl); }
    } catch (e) {
      console.error('failed reading file', e);
    }
    return;
  }

  console.log('Fetching playlists with null image_url...');
  const batchSize = Number(Deno.env.get('BATCH_SIZE') || 50);
  let { data: rows, error } = await supabaseAdmin.from('playlists').select('id,spotify_url,couple_id').is('image_url', null).limit(batchSize);
  if (error) { console.error('select error', error); return; }
  if (!rows || rows.length === 0) { console.log('No rows to process'); return; }

  for (const p of rows) { await processOne(p); }
  console.log('Finished batch. Rerun to process more.');
}

run();
