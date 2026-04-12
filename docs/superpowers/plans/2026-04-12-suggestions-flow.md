# Suggestions Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Get Suggestions flow — simplified homepage entry, a 5-question full-page wizard, a Claude-powered destination results page with 3 cards.

**Architecture:** Three new pages (`/suggest`, `/suggestions`) and one new API route (`/api/destinations`). State is passed between pages via URL search params. The homepage Get Suggestions form is simplified to a single address input. All new pages follow the existing Next.js patterns (Suspense + useSearchParams, Anthropic SDK for AI calls).

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Anthropic SDK (`@anthropic-ai/sdk`)

---

## File Map

| File | Action |
|------|--------|
| `lib/types.ts` | Add `Destination` interface |
| `app/api/destinations/route.ts` | Create — Claude API endpoint returning 3 destinations |
| `app/page.tsx` | Simplify Get Suggestions form to single address input |
| `app/suggest/page.tsx` | Create — 5-question full-page wizard |
| `app/suggestions/page.tsx` | Create — results page with 3 destination cards |

---

### Task 1: Add Destination type to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Destination interface**

Open `lib/types.ts`. At the end of the file, add:

```ts
export interface Destination {
  name: string;
  region: string;
  matchScore: number;
  description: string;
  whyMatch: string;
  whyDrive: string;
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/sharutyunyan/Documents/GitHub/heyroady && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Destination type"
```

---

### Task 2: Create /api/destinations route

**Files:**
- Create: `app/api/destinations/route.ts`

- [ ] **Step 1: Create the file**

Create `app/api/destinations/route.ts` with this content:

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { start, travelStyle, interests, vibe, days, distance } = body;

    if (!start) {
      return Response.json({ error: 'Starting location is required' }, { status: 400 });
    }

    const interestsList = Array.isArray(interests)
      ? interests.join(', ')
      : String(interests);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are Roady, a California road trip expert. Suggest 3 perfect California destinations for this traveler.

Traveler details:
- Starting from: ${start}
- Travel style: ${travelStyle}
- Interests: ${interestsList}
- Trip vibe: ${vibe}
- Trip duration: ${days} days
- Willing to drive: ${distance} from starting point

Return exactly this JSON (no markdown, no extra text):
{
  "destinations": [
    {
      "name": "string — destination name (city or place)",
      "region": "string — California region (e.g. Central Coast, Southern California, Bay Area)",
      "matchScore": number — realistic match percentage between 75 and 98,
      "description": "string — 1-2 sentences about what kind of place this is",
      "whyMatch": "string — personalized reason why this matches their specific preferences",
      "whyDrive": "string — one compelling sentence on why this destination is worth the drive"
    }
  ]
}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);
    return Response.json(data);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `API error: ${error.message}` }, { status: error.status || 500 });
    }
    console.error('Destinations API error:', error);
    return Response.json({ error: 'Failed to get destination suggestions' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/sharutyunyan/Documents/GitHub/heyroady && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/destinations/route.ts
git commit -m "feat: add /api/destinations Claude endpoint"
```

---

### Task 3: Simplify homepage Get Suggestions form

**Files:**
- Modify: `app/page.tsx`

Context: The current Get Suggestions form in `app/page.tsx` has 5 questions with state (`travelStyle`, `interests`, `vibe`, `tripDuration`) and a `handleSuggestSubmit` that shows an alert. These all need to be removed. The new form has one input + one button.

- [ ] **Step 1: Remove unused state declarations**

Find and remove these 4 lines in the state declarations section (around lines 75-78):

```tsx
  const [travelStyle, setTravelStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState('');
  const [tripDuration, setTripDuration] = useState('');
```

- [ ] **Step 2: Remove handleSuggestSubmit**

Find and remove this entire function (around lines 158-163):

```tsx
  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestStart.trim() || !travelStyle || interests.length === 0 || !vibe || !tripDuration) return;
    // TODO: Call API to get suggestions
    alert(`Getting suggestions for: ${suggestStart}, Style: ${travelStyle}, Interests: ${interests.join(', ')}, Vibe: ${vibe}, Duration: ${tripDuration}`);
  };
```

- [ ] **Step 3: Replace the Get Suggestions form**

Find the entire `{/* Get Suggestions flow */}` block (starts with `{flowType === 'suggest' && (` and ends with the matching `}}`). Replace the entire block with:

```tsx
              {/* Get Suggestions flow */}
              {flowType === 'suggest' && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!suggestStart.trim()) return;
                      router.push(`/suggest?start=${encodeURIComponent(suggestStart)}`);
                    }}
                    className="flex flex-col sm:flex-row gap-3 mb-4"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Your starting address or city..."
                        value={suggestStart}
                        onChange={(e) => setSuggestStart(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
                        required
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      className="group/btn relative px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden"
                      style={{
                        backgroundColor: '#D85A30',
                        color: '#ffffff',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        btn.style.boxShadow = '0 14px 28px rgba(27,45,69,0.4)';
                        btn.style.backgroundColor = '#1B2D45';
                        btn.style.color = '#EF9F27';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = '';
                        btn.style.boxShadow = '';
                        btn.style.backgroundColor = '#D85A30';
                        btn.style.color = '#ffffff';
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Get Suggestions
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </span>
                    </button>
                  </form>
                  <p className="text-sm text-gray-400">Free to use. No sign-up required.</p>
                </>
              )}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sharutyunyan/Documents/GitHub/heyroady && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: simplify Get Suggestions form to single address input"
```

---

### Task 4: Create /suggest wizard page

**Files:**
- Create: `app/suggest/page.tsx`

- [ ] **Step 1: Create the wizard page**

Create `app/suggest/page.tsx` with this full content:

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const QUESTIONS = [
  {
    id: 'travelStyle',
    question: 'How do you like to travel?',
    type: 'single' as const,
    options: ['Solo', 'Couple', 'Family', 'Friends'],
  },
  {
    id: 'interests',
    question: 'What are you interested in?',
    type: 'multi' as const,
    options: ['Nature', 'Food', 'Culture', 'Adventure', 'Beaches'],
  },
  {
    id: 'vibe',
    question: "What's your trip vibe?",
    type: 'single' as const,
    options: ['Relaxed', 'Mixed', 'Adventurous'],
  },
  {
    id: 'days',
    question: 'How many days is your trip?',
    type: 'number' as const,
    options: [],
  },
  {
    id: 'distance',
    question: 'How far are you willing to drive?',
    type: 'single' as const,
    options: ['~50 miles', '~100 miles', '200+ miles'],
  },
];

type Answers = {
  travelStyle: string;
  interests: string[];
  vibe: string;
  days: string;
  distance: string;
};

function SuggestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    travelStyle: '',
    interests: [],
    vibe: '',
    days: '',
    distance: '',
  });

  if (!start) {
    router.push('/');
    return null;
  }

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const isAnswered = (() => {
    if (question.type === 'multi') return answers.interests.length > 0;
    if (question.type === 'number') return answers.days.trim() !== '' && Number(answers.days) >= 1;
    return (answers[question.id as keyof Omit<Answers, 'interests'>] as string) !== '';
  })();

  function handleSingle(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value.toLowerCase() }));
  }

  function handleMulti(value: string) {
    const lower = value.toLowerCase();
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(lower)
        ? prev.interests.filter((i) => i !== lower)
        : [...prev.interests, lower],
    }));
  }

  function handleNext() {
    if (isLast) {
      const params = new URLSearchParams({
        start,
        travelStyle: answers.travelStyle,
        interests: answers.interests.join(','),
        vibe: answers.vibe,
        days: answers.days,
        distance: answers.distance,
      });
      router.push(`/suggestions?${params.toString()}`);
    } else {
      setStep((s) => s + 1);
    }
  }

  const currentSingleAnswer = question.id !== 'interests' && question.type !== 'number'
    ? (answers[question.id as keyof Omit<Answers, 'interests'>] as string)
    : '';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="h-16 flex items-center px-6 border-b"
        style={{ backgroundColor: 'rgba(253,246,238,0.92)', borderColor: 'rgba(216,90,48,0.08)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="font-extrabold text-xl tracking-tight"
          style={{ color: '#D85A30' }}
        >
          Roady
        </button>
      </nav>

      {/* Progress bar */}
      <div className="w-full px-6 pt-8">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 mb-2">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i <= step ? '#D85A30' : '#E5E7EB' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <h2
            className="text-2xl sm:text-3xl font-extrabold mb-8"
            style={{ color: '#1B2D45' }}
          >
            {question.question}
          </h2>

          {/* Single-select */}
          {question.type === 'single' && (
            <div className="flex flex-wrap gap-3">
              {question.options.map((opt) => {
                const selected = currentSingleAnswer === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSingle(opt)}
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: selected ? '#D85A30' : 'white',
                      color: selected ? '#ffffff' : '#1B2D45',
                      border: selected ? 'none' : '2px solid #E5E7EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-select */}
          {question.type === 'multi' && (
            <div className="flex flex-wrap gap-3">
              {question.options.map((opt) => {
                const selected = answers.interests.includes(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleMulti(opt)}
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: selected ? '#D85A30' : 'white',
                      color: selected ? '#ffffff' : '#1B2D45',
                      border: selected ? 'none' : '2px solid #E5E7EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Number input */}
          {question.type === 'number' && (
            <input
              type="number"
              placeholder="e.g. 3"
              value={answers.days}
              onChange={(e) => setAnswers((prev) => ({ ...prev, days: e.target.value }))}
              min="1"
              className="px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
              style={{ width: '120px', fontSize: '18px' }}
            />
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-10">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-6 py-4 rounded-xl font-bold text-sm"
                style={{ border: '2px solid #E5E7EB', color: '#6B7280', backgroundColor: 'white' }}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isAnswered}
              className="flex-1 px-8 py-4 rounded-xl font-bold text-base text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#D85A30' }}
            >
              {isLast ? 'Find My Destination →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#FDF6EE' }} />}>
      <SuggestContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/sharutyunyan/Documents/GitHub/heyroady && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/suggest/page.tsx
git commit -m "feat: add 5-question Get Suggestions wizard page"
```

---

### Task 5: Create /suggestions results page

**Files:**
- Create: `app/suggestions/page.tsx`

- [ ] **Step 1: Create the results page**

Create `app/suggestions/page.tsx` with this full content:

```tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Destination } from '@/lib/types';

function SuggestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const start = searchParams.get('start') || '';
  const travelStyle = searchParams.get('travelStyle') || '';
  const interests = searchParams.get('interests') || '';
  const vibe = searchParams.get('vibe') || '';
  const days = searchParams.get('days') || '';
  const distance = searchParams.get('distance') || '';

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          travelStyle,
          interests: interests.split(',').filter(Boolean),
          vibe,
          days: Number(days),
          distance,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get suggestions');
      }
      const data = await res.json();
      setDestinations(data.destinations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [start, travelStyle, interests, vibe, days, distance]);

  useEffect(() => {
    if (!start) {
      router.push('/');
      return;
    }
    fetchDestinations();
  }, [fetchDestinations, router, start]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D85A30] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-lg" style={{ color: '#1B2D45' }}>
            Roady is finding your perfect destination...
          </p>
          <p className="text-sm text-gray-400 mt-2">This takes about 10 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center max-w-md px-6">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchDestinations}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#D85A30' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(253,246,238,0.92)', borderColor: 'rgba(216,90,48,0.08)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="font-extrabold text-xl tracking-tight"
          style={{ color: '#D85A30' }}
        >
          Roady
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
          Your perfect destinations
        </h1>
        <p className="text-gray-500 mb-10">
          Based on your preferences, here are 3 great matches from {start}.
        </p>

        <div className="space-y-6">
          {destinations.map((dest, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-extrabold" style={{ color: '#1B2D45' }}>
                    {dest.name}
                  </h2>
                  <p className="text-sm text-gray-400">{dest.region}</p>
                </div>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ml-4"
                  style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}
                >
                  {dest.matchScore}% match
                </span>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{dest.description}</p>

              <div className="space-y-2 mb-5 px-4 py-3 rounded-xl" style={{ backgroundColor: '#FDF6EE' }}>
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">✨</span>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>
                    {dest.whyMatch}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">🚗</span>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>
                    {dest.whyDrive}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  router.push(
                    `/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(dest.name)}`
                  )
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: '#D85A30' }}
              >
                Plan this trip →
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={fetchDestinations}
          className="mt-8 w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-80"
          style={{ backgroundColor: 'transparent', color: '#1B2D45', border: '2px solid #1B2D45' }}
        >
          Try different destinations
        </button>
      </div>
    </div>
  );
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#FDF6EE' }} />}>
      <SuggestionsContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/sharutyunyan/Documents/GitHub/heyroady && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/suggestions/page.tsx
git commit -m "feat: add destination suggestions results page"
```

---

### Task 6: Push and verify

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Verify deployment (~1 min)**

Open the live site and test the full flow:
1. Homepage loads with "Get Suggestions" selected by default and a single address input
2. Type any address → click "Get Suggestions" → lands on `/suggest` with progress bar
3. Answer all 5 questions → click "Find My Destination" → loading screen appears
4. 3 destination cards appear with match scores, descriptions, why match, why drive
5. "Plan this trip" → lands on `/preferences` with start + destination pre-filled
6. "Try different destinations" → reloads with 3 new suggestions
