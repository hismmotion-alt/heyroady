# Trip Page Redesign + Open in Maps

**Date:** 2026-04-12
**Status:** Approved

## Goal

Redesign the trip results page (`app/trip/page.tsx`) to be more visually polished and add an "Open in Maps" feature that lets users launch the full multi-stop route in Google Maps or Apple Maps with one tap.

## Scope

- Improve sidebar UI (trip summary card, stop cards, Open in Maps buttons)
- Simplify top header
- No changes to map, API, or data fetching logic

---

## Section 1: Layout & Header

**Top header** simplified:
- Left: Roady back button (→ homepage)
- Center: route name only (remove stats — they move to sidebar)
- Right: empty or removed

**Sidebar** (400px, unchanged width) restructured into 3 stacked zones:
1. Trip summary card
2. Stops list
3. Open in Maps buttons

---

## Section 2: Trip Summary Card

Positioned at the top of the sidebar. Styled with:
- Warm cream background (`#FDF6EE`) with orange left border accent
- Route name in bold dark navy (`#1B2D45`)
- Tagline in smaller muted gray
- 3 stat pills in a horizontal row:
  - `📍 N stops`
  - `🛣 X mi`
  - `⏱ ~Xh Xm`

**Duration calculation:**
- Estimated from `trip.totalMiles` at an average speed of 50 mph
- Formula: `hours = totalMiles / 50`, displayed as `Xh Xm`
- Example: 180 miles → ~3h 36m

---

## Section 3: Stop Cards

Each stop card:
- White background, rounded corners, subtle drop shadow
- **Left border:** 3px solid, orange (`#D85A30`) when active, transparent when inactive
- **Header row:** orange numbered circle badge + stop name (bold) + stop type pill (e.g. "Scenic", "Food", "Historic")
- **Description:** 2-line clamped preview
- **Active state:** card lifts with shadow, left border solid orange, map flies to stop
- **Hover state:** light cream background tint (`#FDF6EE`)

Start and end markers remain as labeled dots (green start, navy end) between cards, with improved spacing.

---

## Section 4: Open in Maps Buttons

Pinned at the bottom of the sidebar. Two full-width stacked buttons:

**Google Maps** (primary):
```
https://www.google.com/maps/dir/Start/Stop1/Stop2/.../End
```
- Opens Google Maps app on Android, browser on iOS if app not installed
- Button style: filled orange (`#D85A30`)

**Apple Maps** (secondary):
```
https://maps.apple.com/?saddr=Start&daddr=Stop1+to:Stop2+to:...+to:End
```
- Opens Apple Maps on iPhone/Mac
- Button style: outlined navy (`#1B2D45`)

Both URLs use URL-encoded city name strings from existing stop data. No coordinates or API keys required.

---

## Files to Change

| File | Change |
|------|--------|
| `app/trip/page.tsx` | Restructure sidebar, simplify header, add Open in Maps buttons, add duration calculation |
| `components/StopCard.tsx` | Improve card styling: active border, type pill, hover state |

## Files NOT Changing

- `components/RouteMap.tsx` — no changes
- `app/api/suggest/route.ts` — no changes
- `lib/types.ts` — no changes (unless stop type field needs adding)
