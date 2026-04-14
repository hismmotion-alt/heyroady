# Destinations Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a curated, SEO-friendly `/destinations` listing page and `/destinations/[slug]` mini blog detail pages for 6 classic California road trips, authored as MDX files.

**Architecture:** Routes are MDX files in `content/routes/` with YAML frontmatter. The listing page reads all frontmatter at build time via `gray-matter`. The detail page compiles full MDX via `next-mdx-remote/rsc` with custom components, and uses `generateStaticParams` + `generateMetadata` for static generation and SEO.

**Tech Stack:** Next.js 14 App Router (RSC), TypeScript, Tailwind CSS, `next-mdx-remote`, `gray-matter`

---

## File Map

**New files:**
- `lib/route-types.ts` — TypeScript interfaces for route data
- `lib/routes.ts` — utilities: `getAllRoutes()`, `getAllSlugs()`, `getRouteRaw()`
- `components/route/FeaturedStop.tsx` — MDX component: image + prose + tip callout
- `components/route/FactBox.tsx` — MDX component: "Did you know?" green callout
- `components/route/HiddenGems.tsx` — MDX component: gems with thumbnails
- `components/route/RouteSummary.tsx` — MDX component: numbered stops + CTA buttons
- `components/route/RouteCard.tsx` — listing page card (full-bleed image + overlay)
- `app/destinations/page.tsx` — listing page
- `app/destinations/[slug]/page.tsx` — detail page with generateStaticParams + generateMetadata
- `content/routes/la-san-diego.mdx`
- `content/routes/sacramento-sf.mdx`
- `content/routes/sf-napa.mdx`
- `content/routes/la-big-sur.mdx`
- `content/routes/sf-lake-tahoe.mdx`
- `content/routes/la-palm-springs.mdx`

**Modified files:**
- `package.json` — add `next-mdx-remote`, `gray-matter`
- `components/Navbar.tsx` — add "Destinations" link

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install next-mdx-remote gray-matter
```

- [ ] **Step 2: Verify install**

```bash
npm ls next-mdx-remote gray-matter
```

Expected output: both packages listed without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-mdx-remote and gray-matter"
```

---

## Task 2: Define route types

**Files:**
- Create: `lib/route-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/route-types.ts

export interface RouteFrontmatter {
  slug: string;
  title: string;
  region: string;
  miles: number;
  duration: string;
  stopsCount: number;
  tags: string[];
  heroImage: string;
  metaDescription: string;
  metaKeywords: string[];
}

export interface RouteStop {
  name: string;
  description: string;
  duration: string;
}

export interface RouteGem {
  name: string;
  description: string;
  image: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/route-types.ts
git commit -m "feat: add route TypeScript types"
```

---

## Task 3: Build route utilities

**Files:**
- Create: `lib/routes.ts`
- Create: `content/routes/` (directory)

- [ ] **Step 1: Create the content/routes directory**

```bash
mkdir -p content/routes
```

- [ ] **Step 2: Create `lib/routes.ts`**

```typescript
// lib/routes.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { RouteFrontmatter } from './route-types';

const ROUTES_DIR = path.join(process.cwd(), 'content/routes');

export function getAllRoutes(): RouteFrontmatter[] {
  const files = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.mdx'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
    const { data } = matter(raw);
    return data as RouteFrontmatter;
  });
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''));
}

export function getRouteRaw(slug: string): string {
  const filePath = path.join(ROUTES_DIR, `${slug}.mdx`);
  return fs.readFileSync(filePath, 'utf-8');
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/routes.ts content/routes
git commit -m "feat: add route file utilities"
```

---

## Task 4: Build MDX components

**Files:**
- Create: `components/route/FeaturedStop.tsx`
- Create: `components/route/FactBox.tsx`
- Create: `components/route/HiddenGems.tsx`
- Create: `components/route/RouteSummary.tsx`

- [ ] **Step 1: Create `components/route/FeaturedStop.tsx`**

```typescript
// components/route/FeaturedStop.tsx

interface FeaturedStopProps {
  name: string;
  image: string;
  tip?: string;
  children: React.ReactNode;
}

export default function FeaturedStop({ name, image, tip, children }: FeaturedStopProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>{name}</h2>
      <img
        src={image}
        alt={name}
        className="w-full h-52 object-cover rounded-2xl mb-4"
      />
      <div className="text-gray-600 leading-relaxed mb-4">{children}</div>
      {tip && (
        <div
          className="flex gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: '#FDF6EE', borderLeft: '4px solid #58CC02' }}
        >
          <span className="text-base flex-shrink-0">💡</span>
          <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>{tip}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/route/FactBox.tsx`**

```typescript
// components/route/FactBox.tsx

interface FactBoxProps {
  children: React.ReactNode;
}

export default function FactBox({ children }: FactBoxProps) {
  return (
    <div
      className="rounded-2xl px-6 py-5 mb-10"
      style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
    >
      <p className="text-sm font-bold mb-1" style={{ color: '#15803d' }}>Did you know?</p>
      <div className="text-sm leading-relaxed" style={{ color: '#166534' }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/route/HiddenGems.tsx`**

```typescript
// components/route/HiddenGems.tsx
import type { RouteGem } from '@/lib/route-types';

interface HiddenGemsProps {
  gems: RouteGem[];
}

export default function HiddenGems({ gems }: HiddenGemsProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold mb-4" style={{ color: '#1B2D45' }}>Hidden Gems Along the Way</h2>
      <div className="flex flex-col gap-4">
        {gems.map((gem) => (
          <div key={gem.name} className="flex gap-4 items-start">
            <img
              src={gem.image}
              alt={gem.name}
              className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
            />
            <div>
              <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{gem.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{gem.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/route/RouteSummary.tsx`**

```typescript
// components/route/RouteSummary.tsx
import type { RouteStop } from '@/lib/route-types';

interface RouteSummaryProps {
  start: string;
  end: string;
  stops: RouteStop[];
}

export default function RouteSummary({ start, end, stops }: RouteSummaryProps) {
  const allPoints = [start, ...stops.map((s) => s.name), end];
  const googleUrl =
    'https://www.google.com/maps/dir/' + allPoints.map(encodeURIComponent).join('/');

  return (
    <div className="mt-12">
      <div
        className="rounded-2xl px-6 py-4 mb-6"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <p className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
          Route Summary
        </p>
        <p className="text-sm text-gray-400">All stops at a glance</p>
      </div>

      <div className="flex flex-col gap-0 mb-8">
        {stops.map((stop, i) => (
          <div key={stop.name} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
              style={{ backgroundColor: '#D85A30' }}
            >
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{stop.name}</p>
              <p className="text-sm text-gray-500">{stop.description}</p>
            </div>
            <p className="text-xs text-gray-400 flex-shrink-0">{stop.duration}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <a
          href="/"
          className="flex-1 py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90"
          style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
        >
          Plan this trip with Roady →
        </a>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 rounded-xl font-bold text-sm text-center border-2 transition-all hover:border-[#58CC02] hover:text-[#46a302]"
          style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/route/
git commit -m "feat: add MDX route components (FeaturedStop, FactBox, HiddenGems, RouteSummary)"
```

---

## Task 5: Build RouteCard component

**Files:**
- Create: `components/route/RouteCard.tsx`

- [ ] **Step 1: Create `components/route/RouteCard.tsx`**

```typescript
// components/route/RouteCard.tsx
import type { RouteFrontmatter } from '@/lib/route-types';

interface RouteCardProps {
  route: RouteFrontmatter;
}

export default function RouteCard({ route }: RouteCardProps) {
  return (
    <a
      href={`/destinations/${route.slug}`}
      className="block rounded-2xl overflow-hidden relative group"
      style={{ height: '220px' }}
    >
      <img
        src={route.heroImage}
        alt={route.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {route.region}
        </p>
        <h3 className="text-lg font-extrabold text-white mb-1 leading-tight">{route.title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {route.miles} miles · {route.stopsCount} stops
          </p>
          <span className="text-xs font-bold" style={{ color: '#58CC02' }}>Read →</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/route/RouteCard.tsx
git commit -m "feat: add RouteCard component for destinations listing"
```

---

## Task 6: Write first MDX route — LA → San Diego

**Files:**
- Create: `content/routes/la-san-diego.mdx`

This is the first route. Write it completely — the remaining 5 routes follow the same pattern in Task 9.

- [ ] **Step 1: Create `content/routes/la-san-diego.mdx`**

Note: Do NOT include `import` statements in MDX files. Components are injected by `compileMDX` via the `components` prop in the detail page. Imports inside MDX will cause compilation errors with `next-mdx-remote`.

```mdx
---
slug: la-san-diego
title: "Los Angeles → San Diego"
region: "Southern California"
miles: 120
duration: "2.5 hrs"
stopsCount: 5
tags: ["Beach", "Food", "Scenic"]
heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80"
metaDescription: "Drive PCH from Los Angeles to San Diego past surf towns, sea cliffs, and the best fish tacos in California. Our guide covers every stop on this classic SoCal road trip."
metaKeywords: ["LA to San Diego road trip", "PCH drive California", "Southern California road trip", "Pacific Coast Highway"]
---

One of the most iconic drives in America, the route from Los Angeles to San Diego hugs the Pacific Coast Highway — passing through sun-drenched surf towns, palm-lined boardwalks, and dramatic sea cliffs before arriving in one of California's most beloved cities. It's short enough to do in a day, but good enough to stretch across a long weekend.

<FeaturedStop
  name="Start in Manhattan Beach"
  image="https://images.unsplash.com/photo-1590523278191-995cbcda646b?w=900&q=80"
  tip="Parking on the Strand fills up by 9am on weekends. Arrive early or park a few blocks inland and walk down."
>
  Kick off your drive at Manhattan Beach's famous Strand — a paved oceanfront path stretching the length of the beach. Grab coffee from one of the cafes lining the path, watch the early-morning surfers, and breathe in that classic LA beach vibe before pointing the car south.
</FeaturedStop>

<FactBox>
  The stretch of Pacific Coast Highway between LA and San Diego passes through 7 distinct beach cities, each with its own personality — from the surfer culture of Huntington Beach to the artsy galleries of Laguna Beach. No two are the same.
</FactBox>

<FeaturedStop
  name="Don't Miss: Laguna Beach"
  image="https://images.unsplash.com/photo-1566933293069-b55c7f326dd4?w=900&q=80"
  tip="Head to Heisler Park overlook for the best view of the cove — especially stunning at golden hour."
>
  Laguna Beach is arguably the most visually striking stop on this route. Dramatic bluffs, hidden coves, and a thriving arts scene make it worth at least two hours. Walk down to Victoria Beach to find the famous Pirate Tower rising from the rocks — one of the most photographed spots in California.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "Crystal Cove State Park",
    description: "Historic 1930s beach cottages, tide pools, and some of the clearest water on the coast.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80"
  },
  {
    name: "San Clemente Pier",
    description: "A quiet, locals-only vibe far from the tourist crowds. Best fish & chips on the coast.",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80"
  },
  {
    name: "Del Mar Bluffs",
    description: "A clifftop trail with sweeping ocean views just 20 minutes north of San Diego.",
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=200&q=80"
  }
]} />

<RouteSummary
  start="Los Angeles"
  end="San Diego"
  stops={[
    { name: "Manhattan Beach", description: "The Strand walk + coffee to start the day", duration: "45 min" },
    { name: "Huntington Beach", description: "Surf City USA — boardwalk, pier, fish tacos", duration: "1.5 hrs" },
    { name: "Laguna Beach", description: "Cliffs, coves, galleries, Pirate Tower", duration: "2 hrs" },
    { name: "San Clemente", description: "Quiet pier town, local eats, Spanish colonial architecture", duration: "45 min" },
    { name: "San Diego", description: "Gaslamp Quarter, Balboa Park, or the Embarcadero to finish", duration: "Arrive" }
  ]}
/>
```

- [ ] **Step 2: Verify MDX is valid by checking for syntax errors**

The file should have no unclosed JSX tags. Check each `<FeaturedStop>`, `<FactBox>`, `<HiddenGems>`, and `<RouteSummary>` is properly closed or self-closing.

- [ ] **Step 3: Commit**

```bash
git add content/routes/la-san-diego.mdx
git commit -m "content: add LA to San Diego route"
```

---

## Task 7: Build listing page

**Files:**
- Create: `app/destinations/page.tsx`

- [ ] **Step 1: Create `app/destinations/page.tsx`**

```typescript
// app/destinations/page.tsx
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import RouteCard from '@/components/route/RouteCard';
import { getAllRoutes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'California Road Trip Guides | Roady',
  description: 'Explore the best California road trips — from the Pacific Coast Highway to Wine Country. Curated guides with stops, tips, and hidden gems.',
};

export default function DestinationsPage() {
  const routes = getAllRoutes();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#58CC02' }}>
            Explore
          </p>
          <h1 className="text-4xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
            California Road Trips
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Curated guides to the best drives in the state — with stops, hidden gems, and local tips for each route.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <RouteCard key={route.slug} route={route} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and visit `/destinations`**

```bash
npm run dev
```

Open `http://localhost:3000/destinations`. You should see the page header and one route card for LA → San Diego (from Task 6). If the image loads and the card shows correctly, this is working.

- [ ] **Step 3: Commit**

```bash
git add app/destinations/page.tsx
git commit -m "feat: add destinations listing page"
```

---

## Task 8: Build detail page

**Files:**
- Create: `app/destinations/[slug]/page.tsx`

- [ ] **Step 1: Create `app/destinations/[slug]/page.tsx`**

```typescript
// app/destinations/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import matter from 'gray-matter';
import Navbar from '@/components/Navbar';
import FeaturedStop from '@/components/route/FeaturedStop';
import FactBox from '@/components/route/FactBox';
import HiddenGems from '@/components/route/HiddenGems';
import RouteSummary from '@/components/route/RouteSummary';
import { getAllSlugs, getRouteRaw } from '@/lib/routes';
import type { RouteFrontmatter } from '@/lib/route-types';

const mdxComponents = { FeaturedStop, FactBox, HiddenGems, RouteSummary };

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const raw = getRouteRaw(params.slug);
    const { data } = matter(raw);
    const frontmatter = data as RouteFrontmatter;
    return {
      title: `${frontmatter.title} Road Trip Guide | Roady`,
      description: frontmatter.metaDescription,
      keywords: frontmatter.metaKeywords,
    };
  } catch {
    return { title: 'Route Not Found | Roady' };
  }
}

export default async function RouteDetailPage({ params }: PageProps) {
  let raw: string;
  try {
    raw = getRouteRaw(params.slug);
  } catch {
    notFound();
  }

  const { data } = matter(raw);
  const frontmatter = data as RouteFrontmatter;

  const { content } = await compileMDX({
    source: raw,
    components: mdxComponents,
    options: { parseFrontmatter: true },
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      {/* Hero */}
      <div className="relative w-full" style={{ height: '420px' }}>
        <img
          src={frontmatter.heroImage}
          alt={frontmatter.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 pb-8">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            {frontmatter.region}
          </p>
          <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight">
            {frontmatter.title}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {frontmatter.miles} miles · {frontmatter.duration} · {frontmatter.stopsCount} stops
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        {/* Back link */}
        <a
          href="/destinations"
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 flex items-center gap-1 transition-colors"
        >
          ← All road trips
        </a>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-8">
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* MDX body */}
        <div className="prose prose-lg max-w-none" style={{ color: '#374151' }}>
          {content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Visit the detail page in dev**

Open `http://localhost:3000/destinations/la-san-diego`. You should see:
- Full-bleed hero image with title overlay
- Tag pills (Beach, Food, Scenic)
- Intro paragraph
- Two FeaturedStop sections with images and tip boxes
- FactBox
- HiddenGems section
- RouteSummary with numbered stops and two CTA buttons

- [ ] **Step 3: Install `@tailwindcss/typography` for prose styling (if `prose` classes don't render)**

If the MDX body text renders unstyled, install the typography plugin:

```bash
npm install --save-dev @tailwindcss/typography
```

Then add to `tailwind.config.js` (or `tailwind.config.ts`):

```javascript
plugins: [require('@tailwindcss/typography')],
```

- [ ] **Step 4: Commit**

```bash
git add app/destinations/[slug]/page.tsx
git commit -m "feat: add route detail page with static generation and SEO metadata"
```

---

## Task 9: Write remaining 5 MDX route files

**Files:**
- Create: `content/routes/sacramento-sf.mdx`
- Create: `content/routes/sf-napa.mdx`
- Create: `content/routes/la-big-sur.mdx`
- Create: `content/routes/sf-lake-tahoe.mdx`
- Create: `content/routes/la-palm-springs.mdx`

- [ ] **Step 1: Create `content/routes/sacramento-sf.mdx`**

```mdx
---
slug: sacramento-sf
title: "Sacramento → San Francisco"
region: "Bay Area"
miles: 90
duration: "1.5 hrs"
stopsCount: 4
tags: ["History", "Scenic", "Food"]
heroImage: "https://images.unsplash.com/photo-1541464522988-31b420d5ed59?w=1200&q=80"
metaDescription: "Drive from Sacramento to San Francisco through the Sacramento Delta, past waterfront towns, and across the Bay Bridge. A California classic with history at every turn."
metaKeywords: ["Sacramento to San Francisco road trip", "Bay Area drive", "Sacramento SF drive", "California Delta road trip"]
---

The drive from California's capital to its most iconic city winds through the Sacramento-San Joaquin Delta — a maze of rivers, drawbridges, and waterfront towns that feels worlds away from urban California. It's a short drive, but one that rewards anyone willing to slow down and explore the back roads.

<FeaturedStop
  name="Stop in Old Sacramento"
  image="https://images.unsplash.com/photo-1609825243434-43b7a2f73ddc?w=900&q=80"
  tip="The California State Railroad Museum is one of the best museums in the state — worth 2 hours even for non-train fans."
>
  Before leaving Sacramento, spend an hour in Old Sacramento — the preserved Gold Rush-era waterfront district with wooden boardwalks, historic storefronts, and riverside views. It's a vivid reminder that California was built on ambition and movement.
</FeaturedStop>

<FactBox>
  The Sacramento-San Joaquin Delta is one of the most complex waterway systems in North America — over 1,000 miles of waterways connecting rivers, sloughs, and channels. The region supplies drinking water to two-thirds of California.
</FactBox>

<FeaturedStop
  name="The Delta: Isleton and Locke"
  image="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80"
  tip="Locke is a National Historic Landmark — the only rural town in the US built and inhabited by Chinese Americans during the 1800s."
>
  Take the back road through the Delta via Highway 160 and stop in the tiny towns of Isleton and Locke. Locke in particular is a step back in time — a handful of wooden buildings perched on the levee, preserved exactly as they were a century ago.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "Benicia",
    description: "California's third state capital, now a quiet waterfront town with great art galleries and the world's largest mothball fleet visible offshore.",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80"
  },
  {
    name: "Carquinez Bridge Overlook",
    description: "Pull off at the Vista Point for sweeping views of the Carquinez Strait — the point where the Sacramento River meets the Bay.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80"
  },
  {
    name: "Berkeley Marina",
    description: "A quiet detour before SF — kite flyers, bay views, and a great stretch of waterfront path.",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=200&q=80"
  }
]} />

<RouteSummary
  start="Sacramento"
  end="San Francisco"
  stops={[
    { name: "Old Sacramento", description: "Gold Rush waterfront district + Railroad Museum", duration: "1 hr" },
    { name: "Isleton", description: "Delta town, crawdad capital of the world", duration: "30 min" },
    { name: "Locke", description: "Historic Chinese-American town on the levee", duration: "30 min" },
    { name: "Benicia", description: "Waterfront, galleries, former state capital", duration: "45 min" }
  ]}
/>
```

- [ ] **Step 2: Create `content/routes/sf-napa.mdx`**

```mdx
---
slug: sf-napa
title: "San Francisco → Napa Valley"
region: "Wine Country"
miles: 55
duration: "1.25 hrs"
stopsCount: 4
tags: ["Wine", "Scenic", "Food", "Culture"]
heroImage: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80"
metaDescription: "Cross the Golden Gate, drive through Sonoma, and arrive in Napa Valley wine country. The perfect California day trip from San Francisco."
metaKeywords: ["San Francisco to Napa road trip", "Wine Country drive", "SF to Napa Valley", "Golden Gate to wine country"]
---

Cross the Golden Gate Bridge at sunrise and you'll be sipping Cabernet in Napa Valley by noon. This is California's most beloved short trip — a seamless transition from city to small towns to rolling vineyards in little over an hour.

<FeaturedStop
  name="Cross the Golden Gate"
  image="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=900&q=80"
  tip="Stop at the Vista Point on the Marin side for the best angle of the bridge with the city behind it."
>
  The drive begins with one of the most dramatic openings in the world of road trips — the Golden Gate Bridge. If you haven't crossed it recently, pull over at the north end Vista Point and take it in. The view back toward San Francisco on a clear morning is unforgettable.
</FeaturedStop>

<FactBox>
  Napa Valley is only 30 miles long and 5 miles wide — but it contains over 400 wineries. The valley's unique combination of fog from the Bay, volcanic soil, and warm afternoons creates ideal growing conditions for Cabernet Sauvignon.
</FactBox>

<FeaturedStop
  name="The Heart of Napa: Yountville"
  image="https://images.unsplash.com/photo-1560493676-04071c5f467b?w=900&q=80"
  tip="Thomas Keller's The French Laundry is here — book 2 months ahead if that's your goal. Otherwise, Bouchon Bakery is an accessible alternative."
>
  Yountville is Napa Valley's most charming town — a walkable main street lined with world-class restaurants, boutiques, and galleries, framed by vineyards on both sides. Even without a winery reservation, it's worth a slow afternoon.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "di Rosa Center for Contemporary Art",
    description: "An outdoor sculpture park and art museum set on a 217-acre estate in Carneros — rarely crowded, genuinely remarkable.",
    image: "https://images.unsplash.com/photo-1578926078693-4e2f95b12513?w=200&q=80"
  },
  {
    name: "Oakville Grocery",
    description: "California's oldest continuously operating grocery store, stocked with local cheeses, charcuterie, and wine for the perfect picnic.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80"
  },
  {
    name: "Alston Park, Napa",
    description: "A 157-acre open space with trails and views over the valley floor — great for hiking off the wine trail.",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80"
  }
]} />

<RouteSummary
  start="San Francisco"
  end="Napa Valley"
  stops={[
    { name: "Golden Gate Bridge", description: "Vista Point stop on the Marin side", duration: "20 min" },
    { name: "Sonoma Plaza", description: "Historic town square, good coffee and cheese shops", duration: "45 min" },
    { name: "Yountville", description: "World-class restaurants, boutiques, vineyard views", duration: "2 hrs" },
    { name: "Napa Downtown", description: "Oxbow Market, waterfront walk, wine bars", duration: "1.5 hrs" }
  ]}
/>
```

- [ ] **Step 3: Create `content/routes/la-big-sur.mdx`**

```mdx
---
slug: la-big-sur
title: "Los Angeles → Big Sur"
region: "Central Coast"
miles: 320
duration: "5 hrs"
stopsCount: 5
tags: ["Scenic", "Nature", "Adventure", "Coastal"]
heroImage: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80"
metaDescription: "Drive north from Los Angeles along the Pacific Coast Highway to Big Sur — one of the most dramatic coastlines in the world. Our guide covers every unmissable stop."
metaKeywords: ["LA to Big Sur road trip", "Pacific Coast Highway Big Sur", "PCH drive California", "Big Sur road trip guide"]
---

The drive from Los Angeles to Big Sur along the Pacific Coast Highway is arguably the most spectacular coastal drive in the world. The road clings to cliffsides hundreds of feet above the Pacific, passes through Santa Barbara and San Luis Obispo, and arrives at Big Sur — a 90-mile stretch of wilderness coastline where mountains meet the sea.

<FeaturedStop
  name="Santa Barbara: The American Riviera"
  image="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=900&q=80"
  tip="Park near State Street and walk — everything worth seeing in Santa Barbara is within a 10-minute stroll."
>
  About 1.5 hours north of LA, Santa Barbara is the obvious first stop. White stucco buildings with red tile roofs, the historic courthouse with its panoramic clock tower, and a stretch of clean beach that earned the city its nickname: the American Riviera. Give it 2 hours minimum.
</FeaturedStop>

<FactBox>
  Big Sur has no incorporated towns and no traffic lights. The coastal stretch was one of the last areas in California to get a paved road — Highway 1 through Big Sur wasn't fully connected until 1937, making it accessible to ordinary travelers for the first time.
</FactBox>

<FeaturedStop
  name="McWay Falls: The Unmissable Stop"
  image="https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=900&q=80"
  tip="The overlook is a 0.5 mile round-trip walk from the Julia Pfeiffer Burns parking lot. It's free and never closes."
>
  McWay Falls drops 80 feet directly onto a remote, inaccessible beach cove — one of only a handful of waterfalls in the world that falls directly into the ocean. You can't reach the beach, but the overlook trail at Julia Pfeiffer Burns State Park frames it perfectly. Don't miss it.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "Morro Rock, Morro Bay",
    description: "A 23-million-year-old volcanic plug rising from the harbor. The town around it is quiet, local, and full of good seafood.",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80"
  },
  {
    name: "Ragged Point",
    description: "The unofficial gateway to Big Sur — a cliffside inn with a trail down to the beach and the first real views of the dramatic coastline ahead.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80"
  },
  {
    name: "Pfeiffer Beach",
    description: "Purple sand from manganese garnet in the cliffs, and a sea arch you can walk through at low tide. One of Big Sur's best-kept secrets.",
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=200&q=80"
  }
]} />

<RouteSummary
  start="Los Angeles"
  end="Big Sur"
  stops={[
    { name: "Santa Barbara", description: "State Street, courthouse, beach walk", duration: "2 hrs" },
    { name: "San Luis Obispo", description: "Bubblegum Alley, Mission Plaza, great coffee", duration: "1 hr" },
    { name: "Morro Bay", description: "The Rock, harbor seafood, waterfront walk", duration: "45 min" },
    { name: "Ragged Point", description: "First Big Sur views, cliff trail, espresso bar", duration: "30 min" },
    { name: "Big Sur / McWay Falls", description: "Julia Pfeiffer Burns State Park — the main event", duration: "1.5 hrs" }
  ]}
/>
```

- [ ] **Step 4: Create `content/routes/sf-lake-tahoe.mdx`**

```mdx
---
slug: sf-lake-tahoe
title: "San Francisco → Lake Tahoe"
region: "Northern California"
miles: 195
duration: "3.5 hrs"
stopsCount: 4
tags: ["Nature", "Adventure", "Scenic", "Mountains"]
heroImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80"
metaDescription: "Drive east from San Francisco through the Sierra Nevada foothills to Lake Tahoe — the clearest alpine lake in North America. A four-season road trip destination."
metaKeywords: ["San Francisco to Lake Tahoe road trip", "SF to Tahoe drive", "Sierra Nevada road trip", "Lake Tahoe drive guide"]
---

Head east from San Francisco and the terrain transforms completely — Bay flatlands give way to Gold Rush foothills, then to the pine forests and granite peaks of the Sierra Nevada, and finally to the impossibly blue expanse of Lake Tahoe. It's a drive through the full depth of California geography in under 4 hours.

<FeaturedStop
  name="Gold Country: Auburn and Placerville"
  image="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80"
  tip="Old Town Auburn is worth a stop for coffee and a walk — it's the self-proclaimed endurance capital of the world and has a great local energy."
>
  The Sierra Nevada foothills were the site of the 1849 Gold Rush, and the towns of Auburn and Placerville still carry that history. Auburn's Old Town sits at the confluence of several American River canyons — a dramatic setting that also makes it a hub for world-class whitewater rafting in spring.
</FeaturedStop>

<FactBox>
  Lake Tahoe is the largest alpine lake in North America and the second deepest in the US. Its water is so clear you can see objects at 70 feet depth. The lake sits at 6,225 feet elevation — which is why it stays cool even in summer and receives heavy snowfall in winter.
</FactBox>

<FeaturedStop
  name="Emerald Bay: Tahoe's Crown Jewel"
  image="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=80"
  tip="The Emerald Bay overlook on Highway 89 is free and takes 5 minutes. It may be the best view in California. Don't drive through without stopping."
>
  Emerald Bay is a small glacially carved inlet on Tahoe's southwest shore — its vivid turquoise water and Vikingsholm castle make it the most photographed spot at the lake. The overlook from Highway 89 requires no hiking; the full hike down to the shore is 1.5 miles round-trip and worth every step.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "Donner Lake",
    description: "Just west of Tahoe, a quieter lake with a dramatic history and far fewer crowds than Tahoe's main shores.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80"
  },
  {
    name: "South Lake Tahoe Farmers Market",
    description: "Summer Tuesdays only — local produce, arts and crafts, and a great snapshot of Tahoe community life.",
    image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=200&q=80"
  },
  {
    name: "Cave Rock",
    description: "A volcanic outcropping rising from the east shore — tunneled through by Highway 50 and considered sacred by the Washoe tribe.",
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=200&q=80"
  }
]} />

<RouteSummary
  start="San Francisco"
  end="Lake Tahoe"
  stops={[
    { name: "Auburn", description: "Old Town, Gold Rush history, canyon views", duration: "45 min" },
    { name: "Placerville", description: "Hangtown history, apple orchards, Gold Rush main street", duration: "30 min" },
    { name: "South Lake Tahoe", description: "Beach access, food, boat rentals", duration: "1.5 hrs" },
    { name: "Emerald Bay", description: "The overlook is unmissable — Vikingsholm hike if time allows", duration: "45 min" }
  ]}
/>
```

- [ ] **Step 5: Create `content/routes/la-palm-springs.mdx`**

```mdx
---
slug: la-palm-springs
title: "Los Angeles → Palm Springs"
region: "Desert"
miles: 110
duration: "2 hrs"
stopsCount: 4
tags: ["Desert", "Architecture", "Food", "Art"]
heroImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80"
metaDescription: "Drive from Los Angeles to Palm Springs through the San Bernardino Mountains and into the Coachella Valley desert. Mid-century architecture, date shakes, and Joshua Tree nearby."
metaKeywords: ["LA to Palm Springs road trip", "Palm Springs drive", "Los Angeles desert road trip", "Coachella Valley drive"]
---

Drive two hours east from Los Angeles and the landscape shifts dramatically — suburban sprawl gives way to the San Bernardino Mountains, then descends into the Coachella Valley, where palm trees, mid-century modern architecture, and 115-degree summers define one of California's most unique destinations.

<FeaturedStop
  name="San Bernardino Pass: The Descent"
  image="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80"
  tip="Pull over at the Cajon Pass summit before you descend. On a clear day you can see the entire Coachella Valley spread out below — with windmills turning in the desert breeze."
>
  The drive from LA climbs through the San Gabriel Mountains before dropping into the high desert at Cajon Pass. The moment you crest the pass and begin the descent into the Coachella Valley is one of the most dramatic geographical transitions in Southern California — from green mountains to tan desert in 20 minutes.
</FeaturedStop>

<FactBox>
  Palm Springs became a celebrity escape in the 1930s and 1940s when Hollywood studios required stars to stay within a two-hour radius of LA during filming. This led to an explosion of mid-century modern architecture — the city now has one of the largest concentrations of MCM buildings in the world.
</FactBox>

<FeaturedStop
  name="Downtown Palm Springs"
  image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80"
  tip="The Palm Springs Art Museum is free on Thursday evenings — one of the best small museums in California."
>
  Palm Canyon Drive, Palm Springs' main drag, is a textbook in mid-century modern architecture — every storefront and hotel a reminder of the city's glamorous postwar heyday. The Kimpton Rowan rooftop bar has the best view of Mount San Jacinto rising behind the city skyline. Walk it in the early morning before the heat sets in.
</FeaturedStop>

<HiddenGems gems={[
  {
    name: "Shields Date Garden, Indio",
    description: "A legendary date farm since 1924. Get the date shake — one of the quintessential California road trip food stops.",
    image: "https://images.unsplash.com/photo-1474625342403-1b6e4a0a0630?w=200&q=80"
  },
  {
    name: "Cabazon Dinosaurs",
    description: "Two giant dinosaur sculptures visible from I-10 — a surreal roadside attraction that's been here since 1964. Pull over, they're free.",
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=200&q=80"
  },
  {
    name: "The Living Desert Zoo",
    description: "A desert botanical garden and zoo in Palm Desert — surprisingly engaging and focused on Sonoran and Mojave desert ecosystems.",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80"
  }
]} />

<RouteSummary
  start="Los Angeles"
  end="Palm Springs"
  stops={[
    { name: "Cajon Pass Summit", description: "Pull over for the valley overlook before descending", duration: "15 min" },
    { name: "Cabazon Dinosaurs", description: "Roadside classic — two giant prehistoric sculptures", duration: "20 min" },
    { name: "Downtown Palm Springs", description: "Palm Canyon Drive, MCM architecture, art museum", duration: "2 hrs" },
    { name: "Shields Date Garden, Indio", description: "Date shake and farm tour — a California original", duration: "30 min" }
  ]}
/>
```

- [ ] **Step 6: Verify all 6 routes appear on listing page**

With dev server running, visit `http://localhost:3000/destinations`. All 6 route cards should be visible in the grid.

- [ ] **Step 7: Commit**

```bash
git add content/routes/
git commit -m "content: add all 6 curated California road trip routes"
```

---

## Task 10: Update Navbar

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Add Destinations link to `components/Navbar.tsx`**

Find this block (around line 61):

```typescript
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
```

Replace with:

```typescript
<div className="flex items-center gap-4">
  {extraLinks}
  <a
    href="/destinations"
    className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
  >
    Destinations
  </a>
  {user ? (
    <>
      <a
        href="/my-trips"
        className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
      >
        My Trips
      </a>
```

- [ ] **Step 2: Verify Navbar shows Destinations link**

Visit any page in dev — the Navbar should show "Destinations" to the left of "My Trips" (or Sign in if logged out).

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat: add Destinations link to Navbar"
```

---

## Task 11: Build verification

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected output: All 6 `/destinations/[slug]` pages listed under "Static" in the build output. No TypeScript errors. Example:

```
Route (app)                              Size     First Load JS
├ ○ /destinations                        ...
├ ● /destinations/[slug]                 ...
│   ├ /destinations/la-san-diego
│   ├ /destinations/sacramento-sf
│   ├ /destinations/sf-napa
│   ├ /destinations/la-big-sur
│   ├ /destinations/sf-lake-tahoe
│   └ /destinations/la-palm-springs
```

- [ ] **Step 2: Check all detail pages in dev**

Visit each URL and verify the page renders correctly:
- `http://localhost:3000/destinations/la-san-diego`
- `http://localhost:3000/destinations/sacramento-sf`
- `http://localhost:3000/destinations/sf-napa`
- `http://localhost:3000/destinations/la-big-sur`
- `http://localhost:3000/destinations/sf-lake-tahoe`
- `http://localhost:3000/destinations/la-palm-springs`

Each should show: hero image, tag pills, MDX body with FeaturedStop sections, FactBox, HiddenGems, and RouteSummary with working Google Maps link.

- [ ] **Step 3: Verify SEO metadata**

Run a build and check the page source for one route. The `<title>` and `<meta name="description">` should be unique per page:

```bash
curl http://localhost:3000/destinations/la-san-diego | grep -E "<title>|description"
```

Expected:
```html
<title>Los Angeles → San Diego Road Trip Guide | Roady</title>
<meta name="description" content="Drive PCH from Los Angeles to San Diego..."/>
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete destinations feature — listing page, detail pages, 6 routes, SEO"
```
