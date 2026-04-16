# Roady — Claude Code Instructions

## Project Overview

Roady is a full-stack California road trip planner with AI-powered route suggestions, interactive maps, user authentication, and persistent trip saving.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 3.4 + `@tailwindcss/typography` + custom CSS animations
- **Font:** Plus Jakarta Sans (Google Fonts)
- **AI:** `@anthropic-ai/sdk` — Claude for route suggestions
- **Maps:** `mapbox-gl` + Mapbox Geocoding API
- **Auth & DB:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **Content:** MDX via `next-mdx-remote` + `gray-matter` for frontmatter
- **Animations:** `lottie-react` (loaded dynamically, `ssr: false`)

## Project Structure

```
/app               # App Router pages and API routes
  /api             # Route handlers (suggest, save-trip, routes, destinations)
  /auth            # OAuth callback
  /destinations    # Browse + detail pages
  /login           # Auth UI
  /my-trips        # Protected user trip collection
  /preferences     # Trip customization
  /saved/[id]      # Individual saved trip
  /suggest         # Route suggestion from address
  /trip            # Trip detail view
/components        # Reusable React components
  /route           # Route-specific sub-components
/lib               # Types, utilities, Supabase clients, Claude prompts
/content/routes    # MDX route files with YAML frontmatter
/public            # Static assets (images, Lottie JSON)
/styles            # globals.css (Tailwind directives + keyframes)
```

## Key Conventions

### TypeScript
- Strict mode is enabled — no implicit `any`
- Shared types live in `/lib/types.ts` (Stop, TripData, TripPreferences, Destination)
- Route types in `/lib/route-types.ts`
- Use path alias `@/*` (maps to project root)

### Components
- Use `'use client'` for interactive components; prefer Server Components by default
- State management via React hooks (no external state library)
- Dynamic imports with `{ ssr: false }` for Lottie animations

### Styling
- Tailwind for structure and layout
- Inline `style` props for dynamic/computed values (colors, transforms, 3D effects)
- Custom color palette: `coral` (#D85A30), `terra`, `green`, `sky`, `gold`, `sand`, `navy`
- CSS animations defined in `globals.css` (glowPulse, cursorBlink, starIdle, starPop)

### Auth & Protected Routes
- `/my-trips` is protected via `middleware.ts` (Supabase auth check)
- Unauthenticated users are redirected to `/login?next=<path>`
- Server-side Supabase client: use `@/lib/supabase-server.ts`
- Client-side Supabase client: use `@/lib/supabase.ts`

### MDX Content
- Route files live in `/content/routes/*.mdx`
- Each file has YAML frontmatter: `slug`, `title`, `region`, `miles`
- Parsed with `gray-matter` in API/server code

### API Routes
- Claude AI calls are orchestrated in `/app/api/suggest`
- System prompts are centralized in `/lib/prompts.ts`

## Development

```bash
npm run dev      # Start local dev server
npm run build    # Production build
npm run start    # Start production server
```

## Backend Roadmap (planned order)

1. Save trips — Supabase
2. Email subscribers — Resend
3. Payments — Stripe
