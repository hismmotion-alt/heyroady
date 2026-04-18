'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TripPreferences } from '@/lib/types';

export type { TripPreferences };

interface Props {
  onComplete: (prefs: TripPreferences) => void;
  prefilledGroup?: string;
  prefilledStopTypes?: string[];
}

const TRAVEL_GROUPS = [
  { id: 'solo',          label: 'Solo',                 desc: 'Just me and the open road',     emoji: '🎒' },
  { id: 'partner',       label: 'With my partner',      desc: 'A romantic getaway for two',    emoji: '💑' },
  { id: 'family-adults', label: 'Family (adults only)', desc: 'Quality time with the family',  emoji: '👨‍👩‍👦' },
  { id: 'family-kids',   label: 'Family with kids',     desc: 'Fun for all ages',              emoji: '👶' },
  { id: 'friends',       label: 'Friends',              desc: 'A crew adventure',              emoji: '🎉' },
];

const KIDS_AGES = [
  { id: 'baby-toddler', label: 'Baby & toddler', desc: '0–3 years old', emoji: '🍼' },
  { id: 'little-kids',  label: 'Little kids',    desc: '4–7 years old', emoji: '🧸' },
  { id: 'kids',         label: 'Kids',           desc: '8–12 years old',emoji: '🎮' },
  { id: 'teens',        label: 'Teens',          desc: '13–17 years old',emoji: '🎧' },
];

const INTERESTS = [
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
      { id: 'local-food', label: 'Local food', emoji: '🌯' },
      { id: 'wine',       label: 'Wine',       emoji: '🍷' },
      { id: 'coffee',     label: 'Coffee',     emoji: '☕' },
      { id: 'breweries',  label: 'Breweries',  emoji: '🍺' },
      { id: 'bakeries',   label: 'Bakeries',   emoji: '🥐' },
    ],
  },
  {
    category: 'CULTURE',
    items: [
      { id: 'history',        label: 'History',       emoji: '🏛' },
      { id: 'art',            label: 'Art',           emoji: '🎨' },
      { id: 'photography',    label: 'Photography',   emoji: '📷' },
      { id: 'boutique-shops', label: 'Boutique shops',emoji: '🛍' },
      { id: 'museums',        label: 'Museums',       emoji: '🖼' },
    ],
  },
  {
    category: 'ADVENTURE',
    items: [
      { id: 'adventure',     label: 'Thrills',        emoji: '⚡' },
      { id: 'scenic',        label: 'Scenic drives',  emoji: '🛣' },
      { id: 'national-parks',label: 'National Parks', emoji: '🌲' },
      { id: 'road-stops',    label: 'Roadside gems',  emoji: '💎' },
    ],
  },
];

const STOP_COUNTS = [
  { id: '1',    label: '1 stop',        desc: 'Quick and focused',             emoji: '1️⃣' },
  { id: '2',    label: '2 stops',       desc: 'A couple of highlights',        emoji: '2️⃣' },
  { id: '3',    label: '3 stops',       desc: 'A nice balance',                emoji: '3️⃣' },
  { id: '4',    label: '4 stops',       desc: 'Plenty to explore',             emoji: '4️⃣' },
  { id: '5',    label: '5 stops',       desc: 'The full experience',           emoji: '5️⃣' },
  { id: 'auto', label: 'Choose for me', desc: "Let Roady decide the best number", emoji: '✨' },
];

const HOTEL_BUDGETS = [
  { id: '$',    label: 'Budget',     desc: 'Motels, hostels, affordable stays', emoji: '🏨' },
  { id: '$$',   label: 'Mid-range',  desc: 'Comfortable hotels',               emoji: '🏩' },
  { id: '$$$',  label: 'Luxury',     desc: 'Upscale hotels and resorts',        emoji: '🏰' },
  { id: 'none', label: 'No hotel',   desc: "I'll sort accommodation separately",emoji: '🚗' },
];

const STEP_LABELS: Record<string, string> = {
  group:        "WHO'S COMING",
  kids:         'KIDS AGES',
  stopTypes:    'INTERESTS',
  hotelBudget:  'HOTEL',
  hotelDetails: 'HOTEL DETAILS',
  numberOfStops:'STOPS',
};

const STEP_TITLES: Record<string, string> = {
  group:        "Who's coming along?",
  kids:         'How old are the kids?',
  stopTypes:    'Pick a few things you love.',
  hotelBudget:  "What's your hotel budget?",
  hotelDetails: 'Hotel details',
  numberOfStops:'How many stops?',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  group:        "This helps Roady find the right kind of stops for your crew.",
  kids:         "Select all that apply so we find age-appropriate stops.",
  stopTypes:    "Tap as many as you want — Roady will find stops that match your vibe. You can change these anytime.",
  hotelBudget:  "Roady will suggest a hotel at your destination to match.",
  hotelDetails: "Roady will pre-fill your search on Booking.com so you see real availability.",
  numberOfStops:"More stops means more to see — fewer means more time at each.",
};

const STEP_TIPS: Record<string, string> = {
  stopTypes:    "3–5 picks works best. Too few → thin results. Too many → generic ones.",
  numberOfStops:"3 stops is a relaxed pace — plenty of room to linger. 5 is action-packed.",
};

export default function TripPreferencesForm({ onComplete, prefilledGroup, prefilledStopTypes }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [travelGroup, setTravelGroup]     = useState(prefilledGroup || '');
  const [kidsAges, setKidsAges]           = useState<string[]>([]);
  const [stopTypes, setStopTypes]         = useState<string[]>(prefilledStopTypes || []);
  const [numberOfStops, setNumberOfStops] = useState('');
  const [hotelPreference, setHotelPreference] = useState('');
  const [hotelGuests, setHotelGuests]     = useState('');
  const [hotelCheckin, setHotelCheckin]   = useState('');
  const [hotelNights, setHotelNights]     = useState('');

  const skipGroup     = !!prefilledGroup;
  const skipStopTypes = !!prefilledStopTypes;
  const kidsOptional  = skipGroup && prefilledGroup === 'family-kids';
  const showKidsStep  = travelGroup === 'family-kids';

  const steps: string[] = [];
  if (!skipGroup) steps.push('group');
  if (showKidsStep || (skipGroup && prefilledGroup === 'family-kids')) steps.push('kids');
  if (!skipStopTypes) steps.push('stopTypes');
  steps.push('hotelBudget');
  if (hotelPreference !== 'none') steps.push('hotelDetails');
  steps.push('numberOfStops');

  const totalSteps   = steps.length;
  const currentStepId = steps[step];

  function canContinue(): boolean {
    switch (currentStepId) {
      case 'group':        return !!travelGroup;
      case 'kids':         return kidsOptional || kidsAges.length > 0;
      case 'stopTypes':    return stopTypes.length > 0;
      case 'hotelBudget':  return !!hotelPreference;
      case 'hotelDetails': return !!hotelGuests && !!hotelCheckin && !!hotelNights;
      case 'numberOfStops':return !!numberOfStops;
      default: return false;
    }
  }

  function handleComplete() {
    const effectiveGroup     = travelGroup || prefilledGroup || '';
    const effectiveStopTypes = stopTypes.length > 0 ? stopTypes : (prefilledStopTypes || []);
    onComplete({
      travelGroup: effectiveGroup,
      ...(effectiveGroup === 'family-kids' && kidsAges.length > 0 && { kidsAges }),
      stopTypes: effectiveStopTypes,
      numberOfStops,
      stopDuration: '',
      ...(hotelPreference && { hotelPreference }),
      ...(hotelGuests && { hotelGuests }),
      ...(hotelCheckin && { hotelCheckin }),
      ...(hotelNights && { hotelNights }),
    });
  }

  function handleNext() {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleComplete();
  }

  function handleSkip() {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleComplete();
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function toggleMulti(id: string, arr: string[], setter: (v: string[]) => void) {
    if (arr.includes(id)) setter(arr.filter((x) => x !== id));
    else setter([...arr, id]);
  }

  // Pill chip for interests
  function Chip({ id, label, emoji, selected, onClick }: { id: string; label: string; emoji: string; selected: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-150 border-2"
        style={{
          backgroundColor: selected ? '#58CC02' : '#ffffff',
          borderColor: selected ? '#58CC02' : '#E5E7EB',
          color: selected ? '#ffffff' : '#1B2D45',
        }}
      >
        <span>{emoji}</span>
        <span>{label}</span>
      </button>
    );
  }

  // Card for single/multi select (group, kids, hotel, stops)
  function OptionCard({
    item, selected, onClick, multi,
  }: {
    item: { id: string; label: string; desc: string; emoji: string };
    selected: boolean;
    onClick: () => void;
    multi?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-150 text-left"
        style={{
          borderColor: selected ? '#58CC02' : '#E5E7EB',
          backgroundColor: selected ? 'rgba(88,204,2,0.04)' : '#ffffff',
        }}
      >
        <span className="text-2xl flex-shrink-0">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: '#1B2D45' }}>{item.label}</p>
          <p className="text-sm text-gray-400">{item.desc}</p>
        </div>
        <div
          className="w-6 h-6 flex-shrink-0 border-2 flex items-center justify-center transition-all flex-shrink-0"
          style={{
            borderRadius: multi ? '6px' : '50%',
            borderColor: selected ? '#58CC02' : '#D1D5DB',
            backgroundColor: selected ? '#58CC02' : 'transparent',
          }}
        >
          {selected && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>
    );
  }

  const isLastStep = step === totalSteps - 1;
  const tip = STEP_TIPS[currentStepId];

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#F3F4F2' }}
    >
      {/* ── LEFT PANEL ── */}
      <aside className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:h-screen">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#58CC02' }} />
            <span className="font-extrabold text-lg" style={{ color: '#1B2D45' }}>Roady</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Save & exit
          </button>
        </div>

        {/* Progress segments */}
        <div className="px-8 pb-5">
          <div className="flex gap-1.5 mb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full flex-1 transition-all duration-300"
                style={{ backgroundColor: i <= step ? '#58CC02' : '#E5E7EB' }}
              />
            ))}
          </div>
          <p className="text-xs font-bold tracking-widest" style={{ color: '#58CC02' }}>
            STEP {step + 1} OF {totalSteps} · {STEP_LABELS[currentStepId]}
          </p>
        </div>

        {/* Title + description (grows to fill space) */}
        <div className="px-8 flex-1">
          <h2 className="text-3xl xl:text-4xl font-extrabold mb-3 leading-tight" style={{ color: '#1B2D45' }}>
            {STEP_TITLES[currentStepId]}
          </h2>
          <p className="text-base text-gray-400 leading-relaxed">
            {STEP_DESCRIPTIONS[currentStepId]}
          </p>
        </div>

        {/* Roady tip */}
        {tip && (
          <div className="px-8 pt-4 pb-2">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
              <p className="text-sm leading-snug" style={{ color: '#993C1D' }}>
                <strong className="font-bold">Roady tip:</strong> {tip}
              </p>
            </div>
          </div>
        )}

        {/* numberOfStops inline tip (conditional on selection) */}
        {currentStepId === 'numberOfStops' && (numberOfStops === '3' || numberOfStops === '5') && !tip && (
          <div className="px-8 pt-4 pb-2">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
              <p className="text-sm leading-snug" style={{ color: '#993C1D' }}>
                <strong className="font-bold">Roady tip:</strong>{' '}
                {numberOfStops === '3'
                  ? '3 stops is a relaxed pace — plenty of room to linger at lunch.'
                  : '5 stops is action-packed — great if you love variety and don\'t want to miss anything.'}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-sm transition-all hover:border-gray-300"
            style={{ color: '#1B2D45', visibility: step === 0 ? 'hidden' : 'visible', minWidth: 80 }}
          >
            ← Back
          </button>
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="px-4 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-sm transition-all hover:border-gray-300"
              style={{ color: '#6B7280', minWidth: 72 }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#58CC02' }}
          >
            {isLastStep ? 'Plan My Trip' : 'Continue'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto px-6 lg:px-12 py-8 lg:py-12">

        {/* ── Travel Group ── */}
        {currentStepId === 'group' && (
          <div className="max-w-lg flex flex-col gap-3">
            {TRAVEL_GROUPS.map((g) => (
              <OptionCard
                key={g.id}
                item={g}
                selected={travelGroup === g.id}
                onClick={() => setTravelGroup(g.id)}
              />
            ))}
          </div>
        )}

        {/* ── Kids Ages ── */}
        {currentStepId === 'kids' && (
          <div className="max-w-lg flex flex-col gap-3">
            {KIDS_AGES.map((a) => (
              <OptionCard
                key={a.id}
                item={a}
                selected={kidsAges.includes(a.id)}
                onClick={() => toggleMulti(a.id, kidsAges, setKidsAges)}
                multi
              />
            ))}
          </div>
        )}

        {/* ── Interests (chip picker) ── */}
        {currentStepId === 'stopTypes' && (
          <div className="max-w-2xl space-y-8">
            {INTERESTS.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-bold tracking-widest text-gray-400 mb-3">{group.category}</p>
                <div className="flex flex-wrap gap-2.5">
                  {group.items.map((item) => (
                    <Chip
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      emoji={item.emoji}
                      selected={stopTypes.includes(item.id)}
                      onClick={() => toggleMulti(item.id, stopTypes, setStopTypes)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Hotel Budget ── */}
        {currentStepId === 'hotelBudget' && (
          <div className="max-w-lg flex flex-col gap-3">
            {HOTEL_BUDGETS.map((b) => (
              <OptionCard
                key={b.id}
                item={b}
                selected={hotelPreference === b.id}
                onClick={() => setHotelPreference(b.id)}
              />
            ))}
          </div>
        )}

        {/* ── Hotel Details ── */}
        {currentStepId === 'hotelDetails' && (
          <div className="max-w-lg space-y-8">
            {/* Guests */}
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: '#1B2D45' }}>How many guests?</p>
              <div className="flex gap-2 flex-wrap">
                {['1', '2', '3', '4', '5', '6+'].map((n) => (
                  <button
                    key={n}
                    onClick={() => setHotelGuests(n)}
                    className="w-12 h-12 rounded-2xl border-2 font-bold text-sm transition-all"
                    style={{
                      borderColor: hotelGuests === n ? '#58CC02' : '#E5E7EB',
                      backgroundColor: hotelGuests === n ? 'rgba(88,204,2,0.08)' : 'white',
                      color: hotelGuests === n ? '#46a302' : '#1B2D45',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-in */}
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: '#1B2D45' }}>Check-in date</p>
              <input
                type="date"
                value={hotelCheckin}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setHotelCheckin(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 text-sm font-semibold outline-none transition-all bg-white"
                style={{ borderColor: hotelCheckin ? '#58CC02' : '#E5E7EB', color: '#1B2D45' }}
              />
            </div>

            {/* Nights */}
            <div>
              <p className="text-sm font-bold mb-3" style={{ color: '#1B2D45' }}>How many nights?</p>
              <div className="flex gap-2 flex-wrap">
                {['1', '2', '3', '4', '5', '6', '7+'].map((n) => (
                  <button
                    key={n}
                    onClick={() => setHotelNights(n)}
                    className="w-12 h-12 rounded-2xl border-2 font-bold text-sm transition-all"
                    style={{
                      borderColor: hotelNights === n ? '#58CC02' : '#E5E7EB',
                      backgroundColor: hotelNights === n ? 'rgba(88,204,2,0.08)' : 'white',
                      color: hotelNights === n ? '#46a302' : '#1B2D45',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Number of Stops ── */}
        {currentStepId === 'numberOfStops' && (
          <div className="max-w-lg flex flex-col gap-3">
            {STOP_COUNTS.map((c) => (
              <OptionCard
                key={c.id}
                item={c}
                selected={numberOfStops === c.id}
                onClick={() => setNumberOfStops(c.id)}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
