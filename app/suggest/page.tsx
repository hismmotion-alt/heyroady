'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────
type Answers = {
  travelStyle: string;
  interests: string[];
  vibe: string;
  days: string;
  distance: string;
};

type PreviewData = {
  tripName: string;
  description: string;
  pills: string[];
  rows: { label: string; value: string }[];
  social: { count: string; style: string; destinations: string };
};

// ─── Step options ─────────────────────────────────────────────────────────────
const TRAVEL_STYLE_OPTIONS = [
  { id: 'solo',    label: 'Solo',    desc: 'Your pace, your playlist. Flexible stops.',         emoji: '🎒' },
  { id: 'couple',  label: 'Couple',  desc: 'Scenic drives, slower evenings, boutique stays.',   emoji: '💑' },
  { id: 'family',  label: 'Family',  desc: 'Kid-friendly stops, shorter drives.',               emoji: '👨‍👩‍👦' },
  { id: 'friends', label: 'Friends', desc: 'Group-friendly venues, late evenings.',             emoji: '🎉' },
];

const VIBE_OPTIONS = [
  { id: 'relaxed',     label: 'Relaxed',     desc: 'Slow mornings, long lunches', emoji: '🧘' },
  { id: 'mixed',       label: 'Mixed',       desc: 'Balanced active and chill',   emoji: '⚖️' },
  { id: 'adventurous', label: 'Adventurous', desc: 'Packed schedule, max stops',  emoji: '🏔' },
];

const DISTANCE_OPTIONS = [
  { id: '~50 miles',    label: 'Up to 50 mi',  desc: 'Quick coastal or inland escape', emoji: '🏙' },
  { id: '50–100 miles', label: '50–100 mi',    desc: 'Day-trip distance',              emoji: '🌄' },
  { id: '200+ miles',   label: '200+ mi',      desc: 'Full road trip range',           emoji: '🗺' },
];

const INTERESTS_GROUPED = [
  {
    category: 'OUTDOORS',
    items: [
      { id: 'beaches',  label: 'Beaches',  emoji: '🌊' },
      { id: 'hiking',   label: 'Hiking',   emoji: '🥾' },
      { id: 'camping',  label: 'Camping',  emoji: '⛺' },
      { id: 'wildlife', label: 'Wildlife', emoji: '🦅' },
      { id: 'sunsets',  label: 'Sunsets',  emoji: '🌅' },
      { id: 'surf',     label: 'Surf',     emoji: '🏄' },
    ],
  },
  {
    category: 'FOOD & DRINK',
    items: [
      { id: 'food',      label: 'Local food', emoji: '🌯' },
      { id: 'wine',      label: 'Wine',       emoji: '🍷' },
      { id: 'coffee',    label: 'Coffee',     emoji: '☕' },
      { id: 'breweries', label: 'Breweries',  emoji: '🍺' },
      { id: 'bakeries',  label: 'Bakeries',   emoji: '🥐' },
    ],
  },
  {
    category: 'CULTURE',
    items: [
      { id: 'culture',     label: 'History & art',  emoji: '🏛' },
      { id: 'photography', label: 'Photography',    emoji: '📷' },
      { id: 'boutique',    label: 'Boutique shops', emoji: '🛍' },
      { id: 'museums',     label: 'Museums',        emoji: '🖼' },
    ],
  },
  {
    category: 'ADVENTURE',
    items: [
      { id: 'adventure',      label: 'Thrills',        emoji: '⚡' },
      { id: 'nature',         label: 'Scenic drives',  emoji: '🛣' },
      { id: 'national-parks', label: 'National Parks', emoji: '🌲' },
    ],
  },
];

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'travelStyle', label: 'TRAVEL STYLE',
    title: 'How do you like to travel?',
    description: "This helps Roady pick the right pacing, stop density, and lodging tier for your trip.",
    type: 'tiles' as const,
  },
  {
    id: 'interests', label: 'INTERESTS',
    title: 'Pick a few things you love.',
    description: "Tap as many as you want — Roady will find destinations that match your vibe.",
    tip: '3–5 picks works best. Too few → thin results. Too many → generic ones.',
    type: 'interests' as const,
  },
  {
    id: 'vibe', label: 'VIBE',
    title: "What's your trip vibe?",
    description: 'This sets the energy for your whole trip.',
    type: 'pills' as const,
  },
  {
    id: 'days', label: 'DURATION',
    title: 'How many days is your trip?',
    description: 'Roady will plan the right amount to see and do.',
    type: 'number' as const,
  },
  {
    id: 'distance', label: 'DISTANCE',
    title: 'How far are you willing to drive?',
    description: 'Roady will only suggest destinations within your range.',
    type: 'pills' as const,
  },
];

// ─── Preview data ─────────────────────────────────────────────────────────────
const STYLE_PREVIEWS: Record<string, PreviewData> = {
  solo: {
    tripName: 'Solo adventure · Pacific Coast Highway',
    description: 'Your pace, your playlist. Roady gives you total flexibility — linger as long as you want, skip what doesn\'t interest you.',
    pills: ['1–2 nights', '4–5 stops', 'hostel & mid-range'],
    rows: [
      { label: 'Daily pacing',   value: 'Flexible · 5–8 hrs driving' },
      { label: 'Stop density',   value: 'Exploratory · 3–5 / day' },
      { label: 'Lodging tier',   value: 'Hostel to mid-range' },
      { label: 'Vibe bias',      value: 'Independent · spontaneous' },
    ],
    social: { count: '340 solo travelers', style: 'solo travelers', destinations: 'Big Sur and Death Valley' },
  },
  couple: {
    tripName: "Sample couple's trip · Big Sur weekend",
    description: 'Roady will pace this for two — scenic pullouts, a long sunset dinner in Carmel, boutique inn in Cambria, no rushed mornings.',
    pills: ['2 nights', '4–5 stops', 'boutique lodging'],
    rows: [
      { label: 'Daily pacing',   value: 'Slower · 6–7 hrs driving' },
      { label: 'Stop density',   value: 'Curated · 4–5 / day' },
      { label: 'Lodging tier',   value: 'Mid to boutique' },
      { label: 'Vibe bias',      value: 'Scenic · intimate · golden hour' },
    ],
    social: { count: '127 couples', style: 'couples', destinations: 'Big Sur or Sonoma' },
  },
  family: {
    tripName: 'Family road trip · Yosemite weekend',
    description: 'Roady picks kid-friendly stops, shorter drives between them, and hotels with early check-in. No one gets hangry.',
    pills: ['2–3 nights', '3–4 stops', 'family hotels'],
    rows: [
      { label: 'Daily pacing',   value: 'Easy · 4–5 hrs max driving' },
      { label: 'Stop density',   value: 'Kid-friendly · 3–4 / day' },
      { label: 'Lodging tier',   value: 'Family-friendly hotels' },
      { label: 'Vibe bias',      value: 'Playful · educational · scenic' },
    ],
    social: { count: '89 families', style: 'families', destinations: 'Yosemite and Lake Tahoe' },
  },
  friends: {
    tripName: 'Group trip · Wine Country weekend',
    description: 'Group-friendly venues, late evening options, shared spaces. Roady keeps everyone in the same conversation.',
    pills: ['2 nights', '5–6 stops', 'vacation rentals'],
    rows: [
      { label: 'Daily pacing',   value: 'Energetic · 5–7 hrs driving' },
      { label: 'Stop density',   value: 'Varied · 4–6 / day' },
      { label: 'Lodging tier',   value: 'Vacation rentals · boutique' },
      { label: 'Vibe bias',      value: 'Social · lively · discovery' },
    ],
    social: { count: '215 groups', style: 'friend groups', destinations: 'Napa or Santa Barbara' },
  },
};

const VIBE_PREVIEWS: Record<string, PreviewData> = {
  relaxed: {
    tripName: 'Slow-travel route · Carmel to Cambria',
    description: 'Two stops max per day. Long lunches, no alarm clocks, and a coastal walk that stretches into the evening.',
    pills: ['2 stops / day', 'long lunches', 'unhurried'],
    rows: [
      { label: 'Drive days',     value: '≤ 4 hrs at the wheel' },
      { label: 'Stop duration',  value: '2–4 hrs each' },
      { label: 'Evening style',  value: 'Dinner + early rest' },
      { label: 'Overall pace',   value: 'Slow · restorative' },
    ],
    social: { count: '1,200 travelers', style: 'slow travelers', destinations: 'Carmel and Paso Robles' },
  },
  mixed: {
    tripName: 'Balanced route · SF to Monterey',
    description: 'Active mornings, relaxed afternoons. Roady balances must-see spots with breathing room.',
    pills: ['3–4 stops / day', 'morning hikes', 'sunset dinners'],
    rows: [
      { label: 'Drive days',     value: '4–6 hrs at the wheel' },
      { label: 'Stop duration',  value: '1–3 hrs each' },
      { label: 'Evening style',  value: 'Local restaurant + explore' },
      { label: 'Overall pace',   value: 'Balanced · variety' },
    ],
    social: { count: '2,400 travelers', style: 'travelers', destinations: 'Monterey and Santa Cruz' },
  },
  adventurous: {
    tripName: 'Packed route · Joshua Tree to Palm Springs',
    description: 'Max stops, early starts, every hour used. Roady schedules sunrise hikes and late-night tacos.',
    pills: ['5–6 stops / day', 'early starts', 'full days'],
    rows: [
      { label: 'Drive days',     value: '6–8 hrs at the wheel' },
      { label: 'Stop duration',  value: '45 min – 2 hrs each' },
      { label: 'Evening style',  value: 'Late dinner + night life' },
      { label: 'Overall pace',   value: 'High-energy · full schedule' },
    ],
    social: { count: '870 adventurers', style: 'adventurers', destinations: 'Joshua Tree and Death Valley' },
  },
};

const DISTANCE_PREVIEWS: Record<string, PreviewData> = {
  '~50 miles': {
    tripName: 'Day-tripper · Marin Headlands',
    description: 'Golden Gate views, Muir Woods, Point Reyes. Epic scenery within a tight radius — back home by dinner.',
    pills: ['within 50 mi', '1 day', 'no overnight'],
    rows: [
      { label: 'Drive window',   value: 'Under 1 hr from start' },
      { label: 'Trip format',    value: 'Day trip · no overnight' },
      { label: 'Best for',       value: 'Spontaneous weekends' },
      { label: 'Destinations',   value: 'Marin · East Bay · Peninsula' },
    ],
    social: { count: '540 day-trippers', style: 'day-trippers', destinations: 'Marin and Half Moon Bay' },
  },
  '50–100 miles': {
    tripName: 'Weekend escape · Santa Cruz coast',
    description: 'Far enough to feel away, close enough to drive on Friday evening. Beach towns, redwoods, and farm stands.',
    pills: ['50–100 mi', '1–2 nights', 'weekend range'],
    rows: [
      { label: 'Drive window',   value: '1–2 hrs from start' },
      { label: 'Trip format',    value: 'Weekend · 1–2 nights' },
      { label: 'Best for',       value: 'Quick overnight escapes' },
      { label: 'Destinations',   value: 'Santa Cruz · Napa · Monterey' },
    ],
    social: { count: '1,100 weekenders', style: 'weekenders', destinations: 'Santa Cruz and Napa' },
  },
  '200+ miles': {
    tripName: 'Full road trip · PCH from SF to LA',
    description: 'The whole coast. Big Sur, Hearst Castle, Santa Barbara. Multi-day adventure with proper stops along the way.',
    pills: ['200+ mi', '3–5 nights', 'full road trip'],
    rows: [
      { label: 'Drive window',   value: '4–8+ hrs from start' },
      { label: 'Trip format',    value: 'Multi-day · 3–5 nights' },
      { label: 'Best for',       value: 'True California road trips' },
      { label: 'Destinations',   value: 'Big Sur · SB · Palm Springs' },
    ],
    social: { count: '3,200 road-trippers', style: 'road-trippers', destinations: 'Big Sur and Santa Barbara' },
  },
};

function buildInterestsPreview(interests: string[]): PreviewData {
  const outdoor = interests.filter((i) => ['beaches', 'hiking', 'camping', 'wildlife', 'sunsets', 'surf', 'nature', 'national-parks'].includes(i));
  const foodie  = interests.filter((i) => ['food', 'wine', 'coffee', 'breweries', 'bakeries'].includes(i));
  const cultural = interests.filter((i) => ['culture', 'photography', 'boutique', 'museums'].includes(i));

  const dominant = outdoor.length >= foodie.length && outdoor.length >= cultural.length ? 'outdoor'
    : foodie.length >= cultural.length ? 'food' : 'culture';

  if (dominant === 'outdoor') {
    return {
      tripName: 'Outdoor escape · Big Sur & Point Lobos',
      description: 'Based on your picks, Roady will prioritize trails, coastal views, and open-air stops with minimal crowds.',
      pills: interests.slice(0, 3).map((i) => i.charAt(0).toUpperCase() + i.slice(1)),
      rows: [
        { label: 'Stop types',   value: 'Parks · beaches · viewpoints' },
        { label: 'Indoor stops', value: 'Minimal' },
        { label: 'Best season',  value: 'Spring & fall' },
        { label: 'Vibe match',   value: 'Fresh air · discovery' },
      ],
      social: { count: '1,800 nature lovers', style: 'nature lovers', destinations: 'Big Sur and Point Reyes' },
    };
  }
  if (dominant === 'food') {
    return {
      tripName: 'Foodie route · Napa to Sonoma',
      description: 'Roady will anchor stops around restaurants, tasting rooms, farmers markets, and local bakeries.',
      pills: interests.slice(0, 3).map((i) => i.charAt(0).toUpperCase() + i.slice(1)),
      rows: [
        { label: 'Stop types',   value: 'Restaurants · markets · wineries' },
        { label: 'Reservations', value: 'Recommended ahead' },
        { label: 'Best season',  value: 'Year-round' },
        { label: 'Vibe match',   value: 'Indulgent · slow · savory' },
      ],
      social: { count: '960 foodies', style: 'foodies', destinations: 'Napa and Carmel' },
    };
  }
  return {
    tripName: 'Culture trail · Monterey to Santa Cruz',
    description: 'Museums, galleries, historic districts, and boutique strips. Roady keeps the cultural density high.',
    pills: interests.slice(0, 3).map((i) => i.charAt(0).toUpperCase() + i.slice(1)),
    rows: [
      { label: 'Stop types',   value: 'Museums · galleries · shops' },
      { label: 'Indoor stops', value: 'Majority' },
      { label: 'Best season',  value: 'Year-round · rainy days ok' },
      { label: 'Vibe match',   value: 'Curious · creative' },
    ],
    social: { count: '620 culture seekers', style: 'culture seekers', destinations: 'Carmel and Solvang' },
  };
}

function buildDaysPreview(days: number): PreviewData {
  if (!days || days < 1) {
    return {
      tripName: 'Enter number of days…',
      description: 'Roady will suggest the perfect route length and stop count based on your schedule.',
      pills: [],
      rows: [
        { label: 'Stops total',   value: '—' },
        { label: 'Drive total',   value: '—' },
        { label: 'Nights',        value: '—' },
        { label: 'Best format',   value: '—' },
      ],
      social: { count: '2,400+', style: 'travelers', destinations: 'Big Sur and Sonoma' },
    };
  }
  if (days <= 2) {
    return {
      tripName: `${days}-day escape · Coastal day trip`,
      description: `${days} day${days > 1 ? 's' : ''} is perfect for 3–5 stops. Roady keeps the driving tight and the stops memorable.`,
      pills: [`${days} day${days > 1 ? 's' : ''}`, '3–5 stops', 'tight & memorable'],
      rows: [
        { label: 'Stops total',   value: `3–5 stops` },
        { label: 'Drive total',   value: `${days * 2}–${days * 3} hrs` },
        { label: 'Nights',        value: `${days - 1} night${days > 1 ? 's' : ''}` },
        { label: 'Best format',   value: 'Day trip or quick overnight' },
      ],
      social: { count: '3,100 weekenders', style: 'weekenders', destinations: 'Santa Cruz and Marin' },
    };
  }
  if (days <= 5) {
    return {
      tripName: `${days}-day road trip · PCH highlights`,
      description: `${days} days is the sweet spot — enough time for proper stops without rushing. Roady builds a balanced itinerary.`,
      pills: [`${days} days`, `${days * 2}–${days * 3} stops`, 'well-balanced'],
      rows: [
        { label: 'Stops total',   value: `${days * 2}–${days * 3} stops` },
        { label: 'Drive total',   value: `${days * 3}–${days * 4} hrs` },
        { label: 'Nights',        value: `${days - 1} nights` },
        { label: 'Best format',   value: 'Classic road trip' },
      ],
      social: { count: '4,200 road-trippers', style: 'road-trippers', destinations: 'Big Sur and Santa Barbara' },
    };
  }
  return {
    tripName: `${days}-day California deep dive`,
    description: `${days} days lets Roady plan a real journey — multiple regions, diverse stops, unhurried pace. The full California experience.`,
    pills: [`${days} days`, `${days * 2}+ stops`, 'full journey'],
    rows: [
      { label: 'Stops total',   value: `${days * 2}–${days * 3}+ stops` },
      { label: 'Drive total',   value: `${Math.round(days * 3.5)}+ hrs over trip` },
      { label: 'Nights',        value: `${days - 1} nights` },
      { label: 'Best format',   value: 'Multi-region adventure' },
    ],
    social: { count: '1,800 long-trippers', style: 'long-trippers', destinations: 'PCH coast and Yosemite' },
  };
}

function getPreview(answers: Answers, stepIdx: number): PreviewData {
  const defaultPreview: PreviewData = {
    tripName: 'Your California route',
    description: 'Answer the questions and Roady will build your perfect trip in real-time.',
    pills: [],
    rows: [
      { label: 'Daily pacing',  value: '—' },
      { label: 'Stop density',  value: '—' },
      { label: 'Lodging tier',  value: '—' },
      { label: 'Vibe bias',     value: '—' },
    ],
    social: { count: '2,400+', style: 'travelers', destinations: 'Big Sur and Sonoma' },
  };

  if (stepIdx === 0) return STYLE_PREVIEWS[answers.travelStyle] || defaultPreview;
  if (stepIdx === 1) return answers.interests.length > 0 ? buildInterestsPreview(answers.interests) : {
    ...defaultPreview,
    tripName: 'Select your interests…',
    description: 'Roady uses your picks to filter stops — beaches, food halls, art galleries, trails, and more.',
  };
  if (stepIdx === 2) return VIBE_PREVIEWS[answers.vibe] || { ...defaultPreview, tripName: 'Select a vibe…', description: 'Relaxed, mixed, or adventurous — this sets the energy of your whole itinerary.' };
  if (stepIdx === 3) return buildDaysPreview(parseInt(answers.days) || 0);
  if (stepIdx === 4) return DISTANCE_PREVIEWS[answers.distance] || { ...defaultPreview, tripName: 'Select a distance…', description: 'Roady will filter destinations to only those within your chosen driving range.' };
  return defaultPreview;
}

// ─── Live Preview panel ────────────────────────────────────────────────────────
const STRIPE_BG = 'repeating-linear-gradient(-45deg, #e8e3da, #e8e3da 6px, #ddd8ce 6px, #ddd8ce 12px)';

function LivePreview({ answers, stepIdx }: { answers: Answers; stepIdx: number }) {
  const preview = getPreview(answers, stepIdx);
  const avatars = [
    { bg: '#58CC02', init: 'JK' },
    { bg: '#1B2D45', init: 'RM' },
    { bg: '#8B7355', init: 'AL' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <p className="text-xs font-bold tracking-widest text-gray-400">LIVE PREVIEW</p>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#58CC02' }} />
          <span className="text-xs font-semibold" style={{ color: '#58CC02' }}>Updates as you answer</span>
        </div>
      </div>

      {/* Trip card */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 mb-4 shadow-sm">
        <div
          className="h-36 flex items-end px-4 pb-3"
          style={{ background: STRIPE_BG }}
        >
          <span className="text-xs font-mono text-gray-400 bg-white/70 px-2 py-0.5 rounded">coastal photo</span>
        </div>
        <div className="p-5">
          <h3 className="font-extrabold text-base leading-tight mb-2" style={{ color: '#1B2D45' }}>
            {preview.tripName}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{preview.description}</p>
          {preview.pills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {preview.pills.map((pill) => (
                <span
                  key={pill}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: '#F3F4F2', color: '#6B7280' }}
                >
                  {pill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* What Roady does with this */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-4 shadow-sm">
        <p className="font-bold text-sm mb-4" style={{ color: '#1B2D45' }}>✨ What Roady does with this</p>
        <div className="space-y-3">
          {preview.rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <span className="text-sm flex-shrink-0" style={{ color: '#9CA3AF' }}>{row.label}</span>
              <span className="text-sm font-bold text-right" style={{ color: '#1B2D45' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
        <div className="flex items-start gap-3">
          <div className="flex -space-x-2 flex-shrink-0 mt-0.5">
            {avatars.map((a) => (
              <div
                key={a.init}
                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: a.bg }}
              >
                {a.init}
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#993C1D' }}>
            <strong>{preview.social.count}</strong> planned Roady trips this week. Most picked{' '}
            <strong>{preview.social.destinations}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
function SuggestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';

  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    travelStyle: '', interests: [], vibe: '', days: '', distance: '',
  });

  if (!start) { router.push('/'); return null; }

  const current   = STEPS[step];
  const isLast    = step === STEPS.length - 1;
  const totalSteps = STEPS.length;

  const isAnswered = (() => {
    if (current.type === 'interests') return answers.interests.length > 0;
    if (current.type === 'number')    return answers.days.trim() !== '' && Number(answers.days) >= 1;
    if (current.type === 'tiles')     return !!answers.travelStyle;
    if (current.id === 'vibe')        return !!answers.vibe;
    if (current.id === 'distance')    return !!answers.distance;
    return false;
  })();

  function pick(key: keyof Omit<Answers, 'interests'>, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(id: string) {
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
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

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#F3F4F2' }}
    >
      {/* ── LEFT PANEL ── */}
      <aside className="w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:h-screen">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#58CC02' }} />
            <span className="font-extrabold text-lg" style={{ color: '#1B2D45' }}>Roady</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            Save & exit
          </button>
        </div>

        {/* Progress */}
        <div className="px-8 pb-5 flex-shrink-0">
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-300"
                style={{ backgroundColor: i <= step ? '#58CC02' : '#E5E7EB' }} />
            ))}
          </div>
          <p className="text-xs font-bold tracking-widest" style={{ color: '#58CC02' }}>
            STEP {step + 1} OF {totalSteps} · {current.label}
          </p>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          {/* Title + description */}
          <h2 className="text-3xl font-extrabold mb-2 leading-tight" style={{ color: '#1B2D45' }}>
            {current.title}
          </h2>
          <p className="text-base text-gray-400 leading-relaxed mb-6">
            {current.description}
          </p>

          {/* ── Travel Style — 2×2 tiles ── */}
          {current.type === 'tiles' && (
            <div className="grid grid-cols-2 gap-3">
              {TRAVEL_STYLE_OPTIONS.map((opt) => {
                const sel = answers.travelStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => pick('travelStyle', opt.id)}
                    className="relative rounded-2xl border-2 text-left transition-all duration-150 overflow-hidden"
                    style={{
                      borderColor: sel ? '#58CC02' : '#E5E7EB',
                      backgroundColor: sel ? 'rgba(88,204,2,0.04)' : '#ffffff',
                    }}
                  >
                    {/* Illustration area */}
                    <div
                      className="h-20 flex items-center justify-center text-4xl"
                      style={{ background: sel ? 'rgba(88,204,2,0.08)' : STRIPE_BG }}
                    >
                      {opt.emoji}
                    </div>
                    {/* Checkmark */}
                    {sel && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#58CC02' }}>
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-bold text-sm mb-1" style={{ color: '#1B2D45' }}>{opt.label}</p>
                      <p className="text-xs leading-snug" style={{ color: '#9CA3AF' }}>{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Interests — grouped chips ── */}
          {current.type === 'interests' && (
            <div className="space-y-5">
              {INTERESTS_GROUPED.map((group) => (
                <div key={group.category}>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">{group.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const sel = answers.interests.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleInterest(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold text-xs transition-all duration-150 border-2"
                          style={{
                            backgroundColor: sel ? '#58CC02' : '#ffffff',
                            borderColor: sel ? '#58CC02' : '#E5E7EB',
                            color: sel ? '#ffffff' : '#1B2D45',
                          }}
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Vibe — pill tiles ── */}
          {current.id === 'vibe' && (
            <div className="grid grid-cols-1 gap-3">
              {VIBE_OPTIONS.map((opt) => {
                const sel = answers.vibe === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => pick('vibe', opt.id)}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150"
                    style={{
                      borderColor: sel ? '#58CC02' : '#E5E7EB',
                      backgroundColor: sel ? 'rgba(88,204,2,0.04)' : '#ffffff',
                    }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                    {sel && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#58CC02' }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Days — number input ── */}
          {current.type === 'number' && (
            <div>
              <input
                type="number"
                placeholder="3"
                value={answers.days}
                onChange={(e) => setAnswers((prev) => ({ ...prev, days: e.target.value }))}
                min="1" max="14"
                className="w-32 px-5 py-4 rounded-2xl border-2 bg-white font-bold text-gray-900 placeholder:text-gray-300 outline-none transition-all"
                style={{ fontSize: '28px', borderColor: answers.days ? '#58CC02' : '#E5E7EB' }}
              />
              <p className="text-xs text-gray-400 mt-3">days (1 – 14)</p>
            </div>
          )}

          {/* ── Distance — pill tiles ── */}
          {current.id === 'distance' && (
            <div className="grid grid-cols-1 gap-3">
              {DISTANCE_OPTIONS.map((opt) => {
                const sel = answers.distance === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => pick('distance', opt.id)}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150"
                    style={{
                      borderColor: sel ? '#58CC02' : '#E5E7EB',
                      backgroundColor: sel ? 'rgba(88,204,2,0.04)' : '#ffffff',
                    }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                    {sel && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#58CC02' }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Roady tip */}
          {'tip' in current && current.tip && (
            <div className="mt-5">
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
                <p className="text-sm leading-snug" style={{ color: '#993C1D' }}>
                  <strong className="font-bold">Roady tip:</strong> {current.tip}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons — pinned to bottom */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-sm transition-all hover:border-gray-300"
            style={{ color: '#1B2D45', visibility: step === 0 ? 'hidden' : 'visible', minWidth: 80 }}
          >
            ← Back
          </button>
          {!isLast && (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-sm transition-all hover:border-gray-300"
              style={{ color: '#6B7280', minWidth: 72 }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#58CC02' }}
          >
            {isLast ? 'Find My Destination' : 'Continue'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── RIGHT PANEL — Live Preview ── */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto px-6 lg:px-12 py-8 lg:py-12">
        <LivePreview answers={answers} stepIdx={step} />
      </main>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#F3F4F2' }} />}>
      <SuggestContent />
    </Suspense>
  );
}
