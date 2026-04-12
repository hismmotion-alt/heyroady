# Suggestions Flow Redesign

**Date:** 2026-04-12
**Status:** Approved

## Goal

Redesign the "Get Suggestions" flow into a clean three-step experience: simplified homepage entry → full-page questions wizard → AI-powered destination results page.

---

## Section 1: Homepage Changes (`app/page.tsx`)

**Toggle:** "Get Suggestions" (default) | "Plan My Trip" — unchanged order and behavior.

**Get Suggestions form** simplified to:
- Single free-text input: "Where are you starting from?" — accepts any address or city, no autocomplete restriction, no CA_CITIES filtering
- One button: "Get Suggestions"
- On submit → `router.push('/suggest?start=ENCODED_ADDRESS')`

**Plan My Trip tab** — no changes.

**State removed from page.tsx:**
- `suggestStart`, `travelStyle`, `interests`, `vibe`, `tripDuration` — all move to the wizard page
- `handleSuggestSubmit` — removed

---

## Section 2: Questions Wizard (`app/suggest/page.tsx`)

New page. Reads `start` from URL search params.

**Layout:**
- Full-page, cream background (`#FDF6EE`), centered content, max-width ~560px
- Roady logo top-left (links back to homepage)
- Progress bar below nav: step indicator "2 of 5" + 5 segment bar (orange filled, gray empty)
- One question visible at a time
- Back button (hidden on step 1), Next/Submit button

**Questions in order:**

| # | Question | Input type | Options |
|---|----------|-----------|---------|
| 1 | How do you like to travel? | Single-select buttons | Solo, Couple, Family, Friends |
| 2 | What are you interested in? | Multi-select buttons (no limit) | Nature, Food, Culture, Adventure, Beaches |
| 3 | What's your trip vibe? | Single-select buttons | Relaxed, Mixed, Adventurous |
| 4 | How many days is your trip? | Number input (min 1) | Free text |
| 5 | How far are you willing to drive? | Single-select buttons | ~50 miles, ~100 miles, 200+ miles |

**Navigation:**
- "Next" button: disabled until question is answered, advances to next step
- "Back" button: goes to previous step (hidden on step 1)
- On step 5, button label changes to "Find My Destination"
- On final submit → `router.push('/suggestions?start=...&travelStyle=...&interests=nature,food,beaches&vibe=...&days=...&distance=...')` — interests joined as comma-separated string

**Transitions:** Simple fade or slide between questions (CSS transition).

---

## Section 3: Results Page (`app/suggestions/page.tsx`)

New page. Reads all preferences from URL search params and calls the AI API.

**Loading state:**
- Full-screen centered spinner
- Message: "Roady is finding your perfect destination..."

**Results layout:**
- 3 destination cards stacked vertically (or grid on desktop)
- Each card contains:
  - **Destination name** (bold, large) + location/region
  - **Match score pill** (e.g. "94% match") — colored orange/green based on score
  - **Destination description** — 1-2 sentences on what kind of place it is
  - **"Why it's a great match for you"** — personalized to user's answers (e.g. "Perfect for a couple who loves beaches and a relaxed vibe")
  - **"Why it's worth the drive"** — compelling 1-sentence reason to make the trip
  - **"Plan this trip" button** → `router.push('/preferences?start=START&end=DESTINATION_NAME')`
- **"Try different destinations"** button at the bottom → re-calls API for 3 fresh suggestions (same preferences)

**Error state:**
- Simple error message + "Try again" button that retries the API call

---

## Section 4: API Endpoint (`app/api/destinations/route.ts`)

New POST endpoint.

**Request body:**
```json
{
  "start": "Los Angeles, CA",
  "travelStyle": "couple",
  "interests": ["beaches", "food"],
  "vibe": "relaxed",
  "days": 3,
  "distance": "~100 miles"
}
```

**Response:**
```json
{
  "destinations": [
    {
      "name": "Santa Barbara",
      "region": "Central Coast",
      "matchScore": 94,
      "description": "A sun-drenched coastal city with Spanish colonial architecture and pristine beaches.",
      "whyMatch": "Perfect for a relaxed couple getaway with world-class dining and beautiful beaches just 90 miles away.",
      "whyDrive": "The scenic Pacific Coast Highway drive alone is worth the trip."
    },
    ...
  ]
}
```

**Implementation:** Calls Claude API (`claude-sonnet-4-6`) with a structured prompt that takes user preferences and returns exactly 3 destination objects as JSON.

---

## Files Changed

| File | Action |
|------|--------|
| `app/page.tsx` | Simplify Get Suggestions form to single address field |
| `app/suggest/page.tsx` | Create — 5-question wizard |
| `app/suggestions/page.tsx` | Create — results page with 3 destination cards |
| `app/api/destinations/route.ts` | Create — Claude API endpoint |

## Files NOT Changed

- `app/trip/page.tsx` — unchanged
- `app/preferences/page.tsx` — unchanged
- `components/RouteMap.tsx` — unchanged
- `app/api/suggest/route.ts` — unchanged
