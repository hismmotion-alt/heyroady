# Auth + Saved Trips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login via Supabase and the ability for logged-in users to save trips and view them on a "My Trips" page.

**Architecture:** Supabase handles auth (Google OAuth) and the database (`saved_trips` table with RLS). A shared `Navbar` component reads auth state client-side. A new `/api/save-trip` route writes to Supabase server-side. The `/my-trips` page lists saved trips; `/saved/[id]` displays a specific saved trip without re-generating via Claude.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind CSS, existing brand colors (`#58CC02`, `#1B2D45`, `#ffffff`).

---

## Pre-requisites (manual — done by the human before starting)

### Step A: Create a Supabase project
1. Go to supabase.com → New project
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step B: Create the database table
In Supabase dashboard → SQL Editor → run:
```sql
create table saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  start text not null,
  "end" text not null,
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

### Step C: Configure Google OAuth in Supabase
1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Create Google OAuth credentials at console.cloud.google.com:
   - Create a new project (or use existing)
   - APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret into Supabase Google provider settings
4. In Supabase → Authentication → URL Configuration, add:
   - Site URL: `http://localhost:3000` (for dev) / your Vercel URL (for prod)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://your-vercel-domain.vercel.app/auth/callback`

---

## Task 1: Install Supabase packages and create client helpers

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Install packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected output: packages added to `package.json` and `node_modules`.

- [ ] **Step 2: Create `lib/supabase.ts`**

```typescript
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Use in client components ('use client')
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Use in server components, API routes, and Server Actions
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components can't set cookies — safe to ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts package.json package-lock.json
git commit -m "feat: install Supabase packages and create client helpers"
```

---

## Task 2: Auth callback route and middleware

**Files:**
- Create: `app/auth/callback/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create `app/auth/callback/route.ts`**

This route receives the OAuth code from Google, exchanges it for a session, then redirects the user.

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 2: Create `middleware.ts` in project root**

Protects `/my-trips` — redirects unauthenticated users to `/login`.

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/my-trips')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/my-trips/:path*'],
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/auth/callback/route.ts middleware.ts
git commit -m "feat: add auth callback route and middleware for protected routes"
```

---

## Task 3: Login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create `app/login/page.tsx`**

```typescript
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const error = searchParams.get('error');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm text-center">
        <a href="/">
          <img src="/roady-logo.png" alt="Roady" className="h-16 mx-auto mb-8" />
        </a>

        <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
          Welcome to Roady
        </h1>
        <p className="text-gray-500 mb-8">Sign in to save your trips and access them anytime.</p>

        {error && (
          <p className="text-red-500 text-sm mb-4">Something went wrong. Please try again.</p>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-gray-200 bg-white font-bold text-base transition-all duration-200 hover:border-gray-300 hover:shadow-md"
          style={{ color: '#1B2D45' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-6">
          By signing in you agree to save your trips on Roady.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#ffffff' }} />}>
      <LoginContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

Run `npm run dev`, visit `http://localhost:3000/login`. Should see the Roady logo, headline, and "Continue with Google" button. Clicking it should redirect to Google OAuth (will fail if Supabase isn't configured yet — that's OK at this stage).

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add Google OAuth login page"
```

---

## Task 4: Shared Navbar component

**Files:**
- Create: `components/Navbar.tsx`
- Modify: `app/page.tsx` (replace inline nav)
- Modify: `app/suggestions/page.tsx` (replace inline nav)
- Modify: `app/suggest/page.tsx` (replace inline nav)
- Modify: `components/TripPreferences.tsx` (replace inline header logo/auth)

Note: `app/trip/page.tsx` has a unique centered header with route name — leave it as-is and only add auth buttons to it in Task 7.

- [ ] **Step 1: Create `components/Navbar.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  fixed?: boolean;
  logoHeight?: number;
  logoOffsetY?: number;
  logoHref?: string;
  extraLinks?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Navbar({
  fixed = true,
  logoHeight = 56,
  logoOffsetY = 0,
  logoHref = '/',
  extraLinks,
  className = '',
  style,
}: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const positionClass = fixed ? 'fixed top-0 left-0 right-0 z-50' : '';

  return (
    <nav
      className={`${positionClass} backdrop-blur-md border-b ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.06)', ...style }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href={logoHref}>
          <img
            src="/roady-logo.png"
            alt="Roady"
            style={{ height: logoHeight, width: 'auto', transform: `translateY(${logoOffsetY}px)` }}
          />
        </a>

        <div className="flex items-center gap-4">
          {extraLinks}
          {user ? (
            <>
              <a
                href="/my-trips"
                className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
              >
                My Trips
              </a>
              {user.user_metadata?.avatar_url ? (
                <button onClick={handleSignOut} title="Sign out">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-[#58CC02] transition-colors"
                  />
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
                >
                  Sign out
                </button>
              )}
            </>
          ) : (
            <a
              href="/login"
              className="text-sm font-bold px-4 py-2 rounded-lg border-2 transition-all duration-200 hover:border-[#58CC02] hover:text-[#46a302]"
              style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update `app/page.tsx` — replace inline nav with `<Navbar>`**

Import Navbar at the top of the file:
```typescript
import Navbar from '@/components/Navbar';
```

Replace the existing `<nav>` block (the one with `fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b`):
```typescript
      <Navbar
        logoHeight={80}
        logoOffsetY={10}
        logoHref="#hero"
        extraLinks={
          <a href="#how-it-works" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors">
            How It Works
          </a>
        }
      />
```

Remove the now-unused `logoHeight` and `logoOffsetY` constants from the component (lines `const logoHeight = 80;` and `const logoOffsetY = 10;`).

- [ ] **Step 3: Update `app/suggestions/page.tsx` — replace inline nav**

Import Navbar:
```typescript
import Navbar from '@/components/Navbar';
```

Replace the existing `<nav>` block (which currently has `fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 border-b backdrop-blur-md` with a "Roady" button inside):
```typescript
      <Navbar />
```

- [ ] **Step 4: Update `app/suggest/page.tsx` — replace inline nav**

Import Navbar:
```typescript
import Navbar from '@/components/Navbar';
```

Replace the existing `<nav>` block (which has `h-16 flex items-center px-6 border-b` with a "Roady" button):
```typescript
      <Navbar fixed={false} />
```

- [ ] **Step 5: Update `components/TripPreferences.tsx` — replace inline header**

Import Navbar:
```typescript
import Navbar from '@/components/Navbar';
```

Replace the entire `<header>` element (which has the logo img and step counter):
```typescript
      <header className="flex items-center justify-between px-6 pt-6 pb-2">
        <Navbar fixed={false} logoHeight={48} className="w-auto border-0 bg-transparent backdrop-blur-none p-0" style={{ backgroundColor: 'transparent', borderColor: 'transparent' }} />
        <span className="text-sm font-semibold text-gray-400">
          {step + 1} of {totalSteps}
        </span>
      </header>
```

Wait — that won't work cleanly because Navbar is a full-width nav bar. Instead, keep the header structure but just import and render the logo image directly and add auth buttons separately:

Replace the existing `<header>` in TripPreferences:
```typescript
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <a href="/">
          <img src="/roady-logo.png" alt="Roady" style={{ height: 48, width: 'auto' }} />
        </a>
        <span className="text-sm font-semibold text-gray-400">
          {step + 1} of {totalSteps}
        </span>
      </header>
```

(TripPreferences is used inside the preferences page which already has a Suspense boundary. Auth state is handled by the Navbar on other pages. For TripPreferences we just need the logo — no auth buttons needed here since there's no meaningful action to take mid-wizard.)

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual test**

Run `npm run dev`. Visit homepage — should see "Sign in" button top-right. Visit `/login` directly. All other pages should show the logo correctly.

- [ ] **Step 8: Commit**

```bash
git add components/Navbar.tsx app/page.tsx app/suggestions/page.tsx app/suggest/page.tsx components/TripPreferences.tsx
git commit -m "feat: add shared Navbar with auth state, update all pages"
```

---

## Task 5: Save trip API route

**Files:**
- Create: `app/api/save-trip/route.ts`

- [ ] **Step 1: Create `app/api/save-trip/route.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end, trip_data } = await req.json();

    if (!start || !end || !trip_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_trips')
      .insert({ user_id: user.id, start, end: end, trip_data })
      .select('id')
      .single();

    if (error) {
      console.error('Save trip error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Save trip error:', error);
    return Response.json({ error: 'Failed to save trip' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/save-trip/route.ts
git commit -m "feat: add save-trip API route"
```

---

## Task 6: Sticky save bar on trip page

**Files:**
- Modify: `app/trip/page.tsx`

The trip page already has a complex layout. We need to:
1. Add auth state tracking
2. Add save state tracking
3. Add a sticky bar at the bottom
4. Add auth buttons to the existing header

- [ ] **Step 1: Add imports and state to `TripContent` in `app/trip/page.tsx`**

Add to the existing imports at the top of the file:
```typescript
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
```

Add these state variables inside `TripContent`, after the existing `useState` declarations:
```typescript
  const [user, setUser] = useState<User | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
```

Add this `useEffect` inside `TripContent`, after the existing effects:
```typescript
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
```

Add the save handler inside `TripContent`, after `buildMapsUrls`:
```typescript
  const handleSaveTrip = async () => {
    if (!trip || saving || savedTripId) return;
    if (!user) {
      const currentUrl = `/trip?${new URLSearchParams({
        start, end, travelGroup, stopTypes, numberOfStops, stopDuration,
        ...(kidsAges && { kidsAges }),
      }).toString()}`;
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/save-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, trip_data: trip }),
      });
      const data = await res.json();
      if (data.id) setSavedTripId(data.id);
    } catch {
      // silent fail — user can try again
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 2: Add auth buttons to the existing header in `app/trip/page.tsx`**

Find the existing header — it has `<div />` as a spacer on the right. Replace that empty `<div />` with:
```typescript
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <a href="/my-trips" className="text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors hidden sm:block">My Trips</a>
              {user.user_metadata?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border-2 border-gray-200" />
              )}
            </>
          ) : (
            <a href="/login" className="text-sm font-bold px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-[#58CC02] hover:text-[#46a302] transition-all" style={{ color: '#1B2D45' }}>
              Sign in
            </a>
          )}
        </div>
```

- [ ] **Step 3: Add sticky save bar at the bottom of the trip page return**

The trip page's main return has a `<div className="h-screen flex flex-col">`. Wrap the entire content and add the sticky bar after the closing tag of the outer div. Find the closing `</div>` at the very end of the `TripContent` return and add the sticky bar inside, just before that closing tag:

```typescript
      {/* Sticky save bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-t"
        style={{ backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)' }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>Like this trip?</p>
          <p className="text-xs text-gray-400">Save it to your Roady account</p>
        </div>
        <button
          onClick={handleSaveTrip}
          disabled={!!savedTripId || saving}
          className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2"
          style={{
            backgroundColor: savedTripId ? '#f0fce4' : '#58CC02',
            color: savedTripId ? '#46a302' : '#ffffff',
            cursor: savedTripId ? 'default' : 'pointer',
          }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : savedTripId ? (
            '✓ Trip saved'
          ) : (
            '💾 Save this trip'
          )}
        </button>
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

Run `npm run dev`. Generate a trip at `/trip?...`. The sticky bar should appear at the bottom. Not logged in → click "Save this trip" → should redirect to `/login`. Log in → return to trip → click "Save this trip" → should show spinner then "✓ Trip saved".

- [ ] **Step 6: Commit**

```bash
git add app/trip/page.tsx
git commit -m "feat: add sticky save bar and auth state to trip page"
```

---

## Task 7: My Trips page

**Files:**
- Create: `app/my-trips/page.tsx`

- [ ] **Step 1: Create `app/my-trips/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import type { TripData } from '@/lib/types';

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

export default function MyTripsPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setTrips(data as SavedTrip[]);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('saved_trips').delete().eq('id', id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>My Trips</h1>
        <p className="text-gray-500 mb-10">Your saved road trips, ready to revisit.</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="font-bold text-lg mb-2" style={{ color: '#1B2D45' }}>No saved trips yet</p>
            <p className="text-gray-400 mb-6">Plan your first California road trip and save it here.</p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#58CC02' }}
            >
              Plan a trip →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h3 className="font-extrabold text-base" style={{ color: '#1B2D45' }}>
                    {trip.trip_data.routeName}
                  </h3>
                  <p className="text-sm text-gray-400">{trip.start} → {trip.end}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {trip.trip_data.stops.length} stop{trip.trip_data.stops.length !== 1 ? 's' : ''} · {trip.trip_data.totalMiles} miles
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => router.push(`/saved/${trip.id}`)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
                  >
                    View trip →
                  </button>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-400 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/my-trips/page.tsx
git commit -m "feat: add My Trips page with saved trip cards"
```

---

## Task 8: Saved trip view page

**Files:**
- Create: `app/saved/[id]/page.tsx`

This page loads a specific saved trip from Supabase and displays it — no Claude API call, no re-generation.

- [ ] **Step 1: Create `app/saved/[id]/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StopCard from '@/components/StopCard';
import type { TripData } from '@/lib/types';

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

export default function SavedTripPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setTrip(data as SavedTrip); }
        setLoading(false);
      });
  }, [id]);

  const buildMapsUrls = (trip: SavedTrip) => {
    const stops = trip.trip_data.stops;
    const allPoints = [trip.start, ...stops.map((s) => s.city), trip.end];
    const googleUrl = 'https://www.google.com/maps/dir/' + allPoints.map(encodeURIComponent).join('/');
    const appleDaddr = [...stops.map((s) => encodeURIComponent(s.city)), encodeURIComponent(trip.end)].join('+to:');
    const appleUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(trip.start)}&daddr=${appleDaddr}`;
    return { googleUrl, appleUrl };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-10 h-10 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="font-bold text-lg mb-2" style={{ color: '#1B2D45' }}>Trip not found</p>
          <p className="text-gray-400 mb-6">This trip may have been deleted or doesn't exist.</p>
          <button onClick={() => router.push('/my-trips')} className="px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: '#58CC02' }}>
            My Trips
          </button>
        </div>
      </div>
    );
  }

  const { googleUrl, appleUrl } = buildMapsUrls(trip);
  const { routeName, tagline, totalMiles, stops } = trip.trip_data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        {/* Back */}
        <button onClick={() => router.push('/my-trips')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 transition-colors">
          ← My Trips
        </button>

        {/* Header */}
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#1B2D45' }}>{routeName}</h1>
        <p className="text-gray-500 mb-2">{tagline}</p>
        <p className="text-sm text-gray-400 mb-8">{trip.start} → {trip.end} · {totalMiles} miles · {stops.length} stops</p>

        {/* Open in Maps */}
        <div className="flex gap-3 mb-10">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90"
            style={{ backgroundColor: '#58CC02', color: '#ffffff' }}>
            Open in Google Maps
          </a>
          <a href={appleUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-3 rounded-xl font-bold text-sm text-center border-2 transition-all hover:border-[#58CC02] hover:text-[#46a302]"
            style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}>
            Open in Apple Maps
          </a>
        </div>

        {/* Stops */}
        <div className="flex flex-col gap-4">
          {stops.map((stop, i) => (
            <StopCard key={i} stop={stop} index={i} isActive={false} onClick={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

Save a trip from the trip page → go to `/my-trips` → click "View trip →" → should see the saved trip with stops and map links.

- [ ] **Step 4: Commit**

```bash
git add app/saved/[id]/page.tsx
git commit -m "feat: add saved trip view page"
```

---

## Task 9: Deploy and verify

- [ ] **Step 1: Add Supabase env vars to Vercel**

In the Vercel dashboard for the heyroady project:
- Settings → Environment Variables
- Add `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

- [ ] **Step 2: Update Supabase redirect URLs for production**

In Supabase → Authentication → URL Configuration, add:
- Your production Vercel URL to Site URL
- `https://your-vercel-domain.vercel.app/auth/callback` to Redirect URLs

- [ ] **Step 3: Push and deploy**

```bash
git push
```

- [ ] **Step 4: End-to-end test on production**

1. Visit the live site → "Sign in" button visible in nav
2. Click "Sign in" → Google login page appears
3. Complete Google login → redirected back to homepage, profile picture visible
4. Generate a trip → "💾 Save this trip" sticky bar visible
5. Click it → spinner → "✓ Trip saved"
6. Visit `/my-trips` → saved trip card visible
7. Click "View trip →" → saved trip details page loads correctly
8. Click "Delete" → trip removed from list
9. Sign out by clicking profile picture → returns to homepage, "Sign in" button reappears

---

## Self-Review

**Spec coverage:**
- ✅ Google OAuth via Supabase — Task 2 (callback), Task 3 (login page), Task 4 (Navbar with auth state)
- ✅ `saved_trips` table with RLS — Pre-requisites Step B
- ✅ Navbar with Sign in / profile + My Trips — Task 4
- ✅ Sticky save bar on trip page — Task 6
- ✅ `/api/save-trip` endpoint — Task 5
- ✅ `/my-trips` page — Task 7
- ✅ `/saved/[id]` page — Task 8
- ✅ Middleware protecting `/my-trips` — Task 2

**Type consistency:**
- `SavedTrip` type defined identically in Task 7 and Task 8 — consistent
- `TripData` imported from `@/lib/types` in both — consistent
- `createClient()` from `@/lib/supabase` used in all client components — consistent
- `createServerSupabaseClient()` from `@/lib/supabase` used in API route — consistent
