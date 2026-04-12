# Trip Page Redesign + Open in Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the trip results sidebar with a trip summary card, improved stop cards, and "Open in Maps" deep-link buttons for Google Maps and Apple Maps.

**Architecture:** All changes are frontend-only — no API, no new data fetching. Duration is calculated client-side from `trip.totalMiles`. Open in Maps uses URL-encoded deep links constructed from existing stop city name strings.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/trip/page.tsx` | Simplify header, add trip summary card, add Open in Maps buttons, add duration helper |
| `components/StopCard.tsx` | Switch from full border to left-border accent for active/hover states |

---

### Task 1: Add duration helper and simplify header in trip/page.tsx

**Files:**
- Modify: `app/trip/page.tsx`

- [ ] **Step 1: Add the duration calculation helper**

Inside `TripContent()`, directly above the `return` statement, add:

```tsx
const formatDuration = (miles: number) => {
  const hours = miles / 50;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
```

- [ ] **Step 2: Simplify the header — remove stats**

Find this block in the header:

```tsx
<div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
  <span>{trip.stops.length} stops</span>
  <span className="w-px h-4 bg-gray-200" />
  <span>~{trip.totalMiles} mi</span>
</div>
```

Replace it with an empty div to keep the flexbox spacing:

```tsx
<div />
```

- [ ] **Step 3: Verify the page still renders**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Homepage loads, no TypeScript errors in terminal.

- [ ] **Step 4: Commit**

```bash
git add app/trip/page.tsx
git commit -m "feat: add duration helper, simplify trip page header"
```

---

### Task 2: Add trip summary card to top of sidebar

**Files:**
- Modify: `app/trip/page.tsx`

- [ ] **Step 1: Add the trip summary card**

Find this block at the top of the sidebar div (the `w-[400px]` div):

```tsx
<div className="flex items-center gap-3 mb-4 px-1">
  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1D9E75' }} />
  <p className="text-sm font-semibold text-gray-500">{start}</p>
</div>
```

Insert the summary card **before** that block:

```tsx
{/* Trip summary card */}
<div
  className="rounded-2xl p-5 mb-5 border-l-4"
  style={{ backgroundColor: '#FDF6EE', borderColor: '#D85A30' }}
>
  <h2 className="font-extrabold text-lg leading-tight mb-1" style={{ color: '#1B2D45' }}>
    {trip.routeName}
  </h2>
  <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{trip.tagline}</p>
  <div className="flex items-center gap-3 flex-wrap">
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'rgba(216,90,48,0.1)', color: '#D85A30' }}
    >
      📍 {trip.stops.length} stops
    </span>
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}
    >
      🛣 {trip.totalMiles} mi
    </span>
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'rgba(55,138,221,0.1)', color: '#378ADD' }}
    >
      ⏱ ~{formatDuration(trip.totalMiles)}
    </span>
  </div>
</div>
```

- [ ] **Step 2: Verify the summary card appears**

Run: `npm run dev`, navigate to a trip result.
Expected: Summary card with route name, tagline, and 3 stat pills visible at top of sidebar.

- [ ] **Step 3: Commit**

```bash
git add app/trip/page.tsx
git commit -m "feat: add trip summary card with stats to sidebar"
```

---

### Task 3: Add Open in Maps buttons to bottom of sidebar

**Files:**
- Modify: `app/trip/page.tsx`

- [ ] **Step 1: Add the buildMapsUrls helper**

Inside `TripContent()`, directly below the `formatDuration` helper, add:

```tsx
const buildMapsUrls = () => {
  const stops = trip!.stops;
  const allPoints = [start, ...stops.map((s) => s.city), end];
  const googleUrl =
    'https://www.google.com/maps/dir/' +
    allPoints.map((p) => encodeURIComponent(p)).join('/');
  const appleDaddr = [
    ...stops.map((s) => encodeURIComponent(s.city)),
    encodeURIComponent(end),
  ].join('+to:');
  const appleUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${appleDaddr}`;
  return { googleUrl, appleUrl };
};
```

- [ ] **Step 2: Add the Open in Maps buttons**

Find the Roady footer tip block at the bottom of the sidebar:

```tsx
{/* Roady footer tip */}
<div className="mt-6 mx-1 px-4 py-3 rounded-xl" style={{ backgroundColor: '#FDF6EE' }}>
```

Insert the Open in Maps section **before** that block:

```tsx
{/* Open in Maps */}
{(() => {
  const { googleUrl, appleUrl } = buildMapsUrls();
  return (
    <div className="mt-6 mx-1 space-y-3">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: '#D85A30' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        Open in Google Maps
      </a>
      <a
        href={appleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: 'transparent', color: '#1B2D45', border: '2px solid #1B2D45' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        Open in Apple Maps
      </a>
    </div>
  );
})()}
```

- [ ] **Step 3: Verify the buttons appear and links are correct**

Run: `npm run dev`, navigate to a trip result.
Expected:
- Two buttons appear at bottom of sidebar
- Right-click "Open in Google Maps" → copy link → verify it starts with `https://www.google.com/maps/dir/`
- Right-click "Open in Apple Maps" → copy link → verify it starts with `https://maps.apple.com/?saddr=`

- [ ] **Step 4: Commit**

```bash
git add app/trip/page.tsx
git commit -m "feat: add Open in Google Maps and Apple Maps deep-link buttons"
```

---

### Task 4: Improve StopCard left-border active style

**Files:**
- Modify: `components/StopCard.tsx`

- [ ] **Step 1: Replace full border with left-border accent**

Find:

```tsx
className={`rounded-2xl p-5 mb-3 cursor-pointer transition-all duration-200 border-2
  ${isActive ? 'border-[#D85A30] bg-white shadow-lg scale-[1.01]' : 'border-transparent bg-white hover:border-[#D85A30]/30 hover:shadow-md'}`}
```

Replace with:

```tsx
className={`rounded-2xl p-5 mb-3 cursor-pointer transition-all duration-200 border-l-4
  ${isActive ? 'border-[#D85A30] bg-white shadow-lg scale-[1.01]' : 'border-transparent bg-white hover:border-[#D85A30]/50 hover:shadow-md'}`}
```

- [ ] **Step 2: Verify stop card active state**

Run: `npm run dev`, navigate to a trip result.
Expected:
- Inactive stop cards have no visible border
- Hovering a card shows a subtle left orange border
- Clicking a stop card shows a solid orange left border + shadow + slight scale

- [ ] **Step 3: Commit**

```bash
git add components/StopCard.tsx
git commit -m "feat: improve stop card with left-border accent for active state"
```

---

### Task 5: Push and verify on Vercel

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Verify deployment**

Wait ~1 minute, open the live site.
Expected:
- Trip summary card visible in sidebar with stats
- Stop cards use left-border active style
- "Open in Google Maps" and "Open in Apple Maps" buttons appear and produce valid deep-link URLs
- Header no longer shows stats (they live in the summary card)
