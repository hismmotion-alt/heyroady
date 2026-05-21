import { createClient } from '@supabase/supabase-js';
import type { TripData } from '@/lib/types';

type SharedTripRecord = {
  slug: string;
  start: string;
  end: string;
  trip_data: TripData;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSlug() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function getOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');

  const url = new URL(req.url);
  return url.origin;
}

export async function POST(req: Request) {
  try {
    const { start, end, trip } = await req.json();

    if (typeof start !== 'string' || typeof end !== 'string' || !trip) {
      return Response.json({ error: 'Missing trip data' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json({ error: 'Share storage is not configured' }, { status: 500 });
    }

    let slug = createSlug();
    let errorMessage = '';

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase
        .from('shared_trips')
        .insert({
          slug,
          start,
          end,
          trip_data: trip,
        });

      if (!error) {
        const params = new URLSearchParams({ s: slug });
        return Response.json({ slug, url: `${getOrigin(req)}/trip?${params.toString()}` });
      }

      errorMessage = error.message;
      slug = createSlug();
    }

    return Response.json({ error: errorMessage || 'Unable to create share link' }, { status: 500 });
  } catch {
    return Response.json({ error: 'Unable to create share link' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('s');

  if (!slug) {
    return Response.json({ error: 'Missing share id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: 'Share storage is not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('shared_trips')
    .select('slug, start, end, trip_data')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Trip link not found' }, { status: 404 });
  }

  const record = data as SharedTripRecord;
  return Response.json({
    start: record.start,
    end: record.end,
    trip: record.trip_data,
  });
}
