# Destinations Feature — Design Spec

**Date:** 2026-04-13
**Status:** Approved

---

## Overview

A curated, SEO-friendly "Explore California Road Trips" section. Routes are authored as MDX files in the repo (no CMS, no database). The feature consists of two pages: a listing page (`/destinations`) and a route detail page (`/destinations/[slug]`).

---

## Pages

### 1. Listing Page — `/destinations`

**Purpose:** Browse all curated California road trips.

**Layout:**
- Navbar (with "Destinations" link added)
- Page header: "Explore California Road Trips" + subtitle
- Responsive grid of route cards (2 columns on mobile, 3 on desktop)
- Each card: full-bleed image with dark gradient overlay, region label, route name (e.g. "LA → San Diego"), miles + stops count, "Read →" CTA
- Clicking a card navigates to `/destinations/[slug]`

**Initial routes (6):**
1. LA → San Diego (Southern California)
2. Sacramento → San Francisco (Bay Area)
3. San Francisco → Napa Valley (Bay Area)
4. Los Angeles → Big Sur (Central Coast)
5. San Francisco → Lake Tahoe (Northern California)
6. Los Angeles → Palm Springs (Desert)

---

### 2. Route Detail Page — `/destinations/[slug]`

**Purpose:** A mini travel blog post for each route. Readers learn about the trip before optionally planning it with Roady.

**Layout (top to bottom):**

1. **Full-bleed hero image** — route name, region, miles/duration/stops overlaid with dark gradient
2. **Intro section** — route title, 1–2 paragraph prose intro, tag pills (e.g. Beach, Food, Scenic, Photo spots)
3. **Featured stop sections** (1–3 per route) — inline image, prose description, green tip/local callout box
4. **"Did you know?" fact section** — interesting trivia about the route or region
5. **Hidden gems section** — 2–3 lesser-known stops with thumbnail image + short description
6. **Route summary divider** — "Route Summary / All stops at a glance"
7. **Numbered stop list** — stop name, one-line description, suggested duration
8. **CTA row** — "Plan this trip with Roady" (links to `/`) + "Open in Maps" (Google Maps deep link with all stops pre-filled)

---

## Content Architecture

### File structure

```
content/
  routes/
    la-san-diego.mdx
    sacramento-sf.mdx
    sf-napa.mdx
    la-big-sur.mdx
    sf-lake-tahoe.mdx
    la-palm-springs.mdx
```

### MDX frontmatter schema

```yaml
slug: la-san-diego
title: "Los Angeles → San Diego"
region: "Southern California"
miles: 120
duration: "2.5 hrs"
stopsCount: 5
tags: ["Beach", "Food", "Scenic"]
heroImage: "/images/routes/la-san-diego.jpg"
metaDescription: "Drive PCH from LA to San Diego past surf towns, sea cliffs, and the best fish tacos in California."
metaKeywords: ["LA to San Diego road trip", "PCH drive California", "Southern California road trip"]
```

### MDX body sections

The body of each MDX file is free-form but follows a consistent structure:

- `<RouteIntro>` — rendered as the intro paragraph block
- `<FeaturedStop name="..." image="...">` — image + prose + tip
- `<FactBox>` — "Did you know?" callout
- `<HiddenGems>` — list of gems with thumbnails
- `<RouteSummary stops={[...]} />` — renders the numbered stop list + maps CTA

MDX components are defined in `components/route/`.

---

## Routing & Static Generation

- Route: `app/destinations/page.tsx` — listing page, reads all MDX frontmatter at build time
- Route: `app/destinations/[slug]/page.tsx` — detail page
- `generateStaticParams` reads all `.mdx` files in `content/routes/` and returns their slugs
- `generateMetadata` reads frontmatter to return unique `title` and `description` per page

---

## SEO

- Each detail page gets a unique `<title>` (e.g. "LA → San Diego Road Trip Guide | Roady") and `<meta description>` from frontmatter
- Pages are fully statically rendered (no client-side fetching) — ideal for crawlers
- Images use descriptive `alt` text from frontmatter
- URL structure: `/destinations/la-san-diego` — human-readable and keyword-rich

---

## Navigation

- Add "Destinations" nav link to `components/Navbar.tsx`, next to "My Trips"
- Link is always visible (not gated behind auth)

---

## Images

- Route images stored in `public/images/routes/`
- Hero images: landscape, min 1200×600px recommended
- Stop/gem thumbnails: square, min 200×200px
- For launch, use high-quality free images (Unsplash) — manually downloaded and committed to repo

---

## Out of Scope

- CMS or database-backed content editing
- User comments or ratings on routes
- AI-generated route content (all content is hand-authored)
- Filtering or search on the listing page (can be added later)
