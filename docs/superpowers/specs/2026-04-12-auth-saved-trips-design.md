# Auth + Saved Trips Design

**Date:** 2026-04-12
**Status:** Approved

## Goal

Add Google OAuth login via Supabase and the ability for logged-in users to save trips and view them on a "My Trips" page — no passwords, no email input, no magic links.

---

## Section 1: Authentication (Supabase Auth + Google OAuth)

**Provider:** Google OAuth only, handled entirely by Supabase Auth.

**New files:**
- `app/login/page.tsx` — single page with a "Continue with Google" button. Shown when an unauthenticated user tries to save a trip or visit `/my-trips`.
- `app/auth/callback/route.ts` — Next.js route handler that exchanges the OAuth code for a session and redirects the user back to where they came from.
- `middleware.ts` — checks session on protected routes (`/my-trips`), redirects to `/login` if not authenticated.
- `lib/supabase.ts` — exports a browser Supabase client and a server Supabase client (using `@supabase/ssr`).

**Session management:** `@supabase/ssr` handles cookies automatically in Next.js App Router. No manual token storage needed.

**Redirect after login:** `/login` accepts a `?next=` query param (e.g. `/login?next=/my-trips`). After successful Google login, the callback route redirects to that URL. If no `next` param, redirect to `/`.

---

## Section 2: Database (Supabase)

**Table: `saved_trips`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, auto-generated |
| `user_id` | uuid | Foreign key → `auth.users.id` |
| `start` | text | Starting location string |
| `end` | text | Destination string |
| `trip_data` | jsonb | Full generated trip: stops array, totalMiles, duration |
| `created_at` | timestamptz | Auto, default `now()` |

**Row-level security (RLS):** Enabled. Users can only `SELECT`, `INSERT`, and `DELETE` rows where `user_id = auth.uid()`. No user can read another user's trips.

**SQL to run in Supabase dashboard:**
```sql
create table saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start text not null,
  end text not null,
  trip_data jsonb not null,
  created_at timestamptz default now()
);

alter table saved_trips enable row level security;

create policy "Users can manage their own trips"
  on saved_trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Section 3: UI Changes

### Navbar (all pages)

- **Not logged in:** "Sign in" button top-right, outline style, links to `/login`
- **Logged in:** user's Google profile picture (small circle, 32px) + "My Trips" text link

Navbar is currently inline in each page. Extract to a shared `components/Navbar.tsx` that reads session state via `useUser()` from Supabase client.

Pages with navbars to update: `app/page.tsx`, `app/suggestions/page.tsx`, `app/suggest/page.tsx`, `app/trip/page.tsx`, `components/TripPreferences.tsx`.

### Trip Page — Save Flow (`app/trip/page.tsx`)

- Sticky bar fixed at the bottom of the screen: "Save this trip →" green button
- **Not logged in:** clicking redirects to `/login?next=/trip?[current params]`
- **Logged in + not yet saved:** clicking calls `POST /api/save-trip`, bar changes to spinner then "✓ Saved"
- **Already saved:** bar shows "✓ Trip saved" in a muted state, not clickable

### `/api/save-trip` route (`app/api/save-trip/route.ts`)

`POST` — authenticated only (reads session from cookies).

Request body:
```json
{
  "start": "Los Angeles, CA",
  "end": "Santa Barbara",
  "trip_data": { "stops": [...], "totalMiles": 95, "duration": "1h 54m" }
}
```

What it does:
1. Gets authenticated user from Supabase server client
2. Returns 401 if not authenticated
3. Inserts row into `saved_trips` with `user_id` from session
4. Returns `{ success: true, id: "uuid" }`

### `/my-trips` page (`app/my-trips/page.tsx`)

- Protected by middleware — redirects to `/login?next=/my-trips` if not logged in
- Fetches all trips for the current user from Supabase, ordered by `created_at DESC`
- Displays trip cards: start → end, date saved, "View trip →" button
- "View trip" navigates to `/saved/[id]` which loads the exact saved trip data from Supabase — no re-generation
- Empty state: "No saved trips yet — go plan your first road trip →" (links to homepage)
- Loading skeleton while fetching

---

## Section 4: Environment Variables

Add to `.env.local` and Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Google OAuth credentials are configured inside the Supabase dashboard (no extra env vars needed in the app).

---

## Files Changed / Created

| File | Action |
|------|--------|
| `lib/supabase.ts` | Create — browser + server Supabase clients |
| `middleware.ts` | Create — protect `/my-trips` route |
| `app/login/page.tsx` | Create — Google login button |
| `app/auth/callback/route.ts` | Create — OAuth callback handler |
| `app/my-trips/page.tsx` | Create — saved trips list |
| `app/saved/[id]/page.tsx` | Create — view a specific saved trip (loads from Supabase, no re-generation) |
| `app/api/save-trip/route.ts` | Create — save trip endpoint |
| `components/Navbar.tsx` | Create — shared navbar with auth state |
| `app/page.tsx` | Modify — use shared Navbar |
| `app/trip/page.tsx` | Modify — use shared Navbar + sticky save bar |
| `app/suggestions/page.tsx` | Modify — use shared Navbar |
| `app/suggest/page.tsx` | Modify — use shared Navbar |
| `components/TripPreferences.tsx` | Modify — use shared Navbar |

## Files NOT Changed

- All API routes except new `save-trip`
- `lib/types.ts`
- All Lottie/animation logic
- Supabase SQL — run manually in dashboard
