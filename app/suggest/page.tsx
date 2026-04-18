'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
      { id: 'food',       label: 'Local food', emoji: '🌯' },
      { id: 'wine',       label: 'Wine',       emoji: '🍷' },
      { id: 'coffee',     label: 'Coffee',     emoji: '☕' },
      { id: 'breweries',  label: 'Breweries',  emoji: '🍺' },
      { id: 'bakeries',   label: 'Bakeries',   emoji: '🥐' },
    ],
  },
  {
    category: 'CULTURE',
    items: [
      { id: 'culture',      label: 'History & art',   emoji: '🏛' },
      { id: 'photography',  label: 'Photography',     emoji: '📷' },
      { id: 'boutique',     label: 'Boutique shops',  emoji: '🛍' },
      { id: 'museums',      label: 'Museums',         emoji: '🖼' },
    ],
  },
  {
    category: 'ADVENTURE',
    items: [
      { id: 'adventure',     label: 'Thrills',        emoji: '⚡' },
      { id: 'nature',        label: 'Scenic drives',  emoji: '🛣' },
      { id: 'national-parks',label: 'National Parks', emoji: '🌲' },
    ],
  },
];

type Answers = {
  travelStyle: string;
  interests: string[];
  vibe: string;
  days: string;
  distance: string;
};

const STEPS = [
  {
    id: 'travelStyle',
    label: 'TRAVEL STYLE',
    title: 'How do you like to travel?',
    description: 'This helps Roady personalize your destination picks.',
    type: 'single' as const,
    options: [
      { id: 'solo',    label: 'Solo',    emoji: '🎒' },
      { id: 'couple',  label: 'Couple',  emoji: '💑' },
      { id: 'family',  label: 'Family',  emoji: '👨‍👩‍👦' },
      { id: 'friends', label: 'Friends', emoji: '🎉' },
    ],
  },
  {
    id: 'interests',
    label: 'INTERESTS',
    title: 'Pick a few things you love.',
    description: 'Tap as many as you want — Roady will find destinations that match your vibe.',
    tip: '3–5 picks works best. Too few → thin results. Too many → generic ones.',
    type: 'interests' as const,
    options: [],
  },
  {
    id: 'vibe',
    label: 'VIBE',
    title: "What's your trip vibe?",
    description: 'This sets the energy for your whole trip.',
    type: 'single' as const,
    options: [
      { id: 'relaxed',     label: 'Relaxed',     emoji: '🧘' },
      { id: 'mixed',       label: 'Mixed',       emoji: '⚖️' },
      { id: 'adventurous', label: 'Adventurous', emoji: '🏔' },
    ],
  },
  {
    id: 'days',
    label: 'DURATION',
    title: 'How many days is your trip?',
    description: 'Roady will suggest the right amount to see and do.',
    type: 'number' as const,
    options: [],
  },
  {
    id: 'distance',
    label: 'DISTANCE',
    title: 'How far are you willing to drive?',
    description: 'Roady will only suggest destinations within your range.',
    type: 'single' as const,
    options: [
      { id: '~50 miles',    label: 'Up to 50 mi',   emoji: '🏙' },
      { id: '50–100 miles', label: '50–100 mi',      emoji: '🌄' },
      { id: '200+ miles',   label: '200+ mi',        emoji: '🗺' },
    ],
  },
];

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

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const totalSteps = STEPS.length;

  const isAnswered = (() => {
    if (current.type === 'interests') return answers.interests.length > 0;
    if (current.type === 'number') return answers.days.trim() !== '' && Number(answers.days) >= 1;
    return (answers[current.id as keyof Omit<Answers, 'interests'>] as string) !== '';
  })();

  function handleSingle(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function handleToggleInterest(id: string) {
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

  function handleSkip() {
    if (!isLast) setStep((s) => s + 1);
    else handleNext();
  }

  const currentSingleAnswer =
    current.id !== 'interests' && current.type !== 'number'
      ? (answers[current.id as keyof Omit<Answers, 'interests'>] as string)
      : '';

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

        {/* Progress */}
        <div className="px-8 pb-5">
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full flex-1 transition-all duration-300"
                style={{ backgroundColor: i <= step ? '#58CC02' : '#E5E7EB' }}
              />
            ))}
          </div>
          <p className="text-xs font-bold tracking-widest" style={{ color: '#58CC02' }}>
            STEP {step + 1} OF {totalSteps} · {current.label}
          </p>
        </div>

        {/* Title + description */}
        <div className="px-8 flex-1">
          <h2 className="text-3xl xl:text-4xl font-extrabold mb-3 leading-tight" style={{ color: '#1B2D45' }}>
            {current.title}
          </h2>
          <p className="text-base text-gray-400 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Roady tip */}
        {'tip' in current && current.tip && (
          <div className="px-8 pt-4 pb-2">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
              <p className="text-sm leading-snug" style={{ color: '#993C1D' }}>
                <strong className="font-bold">Roady tip:</strong> {current.tip}
              </p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-sm transition-all hover:border-gray-300"
            style={{ color: '#1B2D45', visibility: step === 0 ? 'hidden' : 'visible', minWidth: 80 }}
          >
            ← Back
          </button>
          {!isLast && (
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
            disabled={!isAnswered}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#58CC02' }}
          >
            {isLast ? 'Find My Destination' : 'Continue'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto px-6 lg:px-12 py-8 lg:py-12">

        {/* Single-select (travelStyle, vibe, distance) */}
        {current.type === 'single' && (
          <div className="flex flex-wrap gap-3 max-w-2xl">
            {current.options.map((opt) => {
              const selected = currentSingleAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSingle(opt.id)}
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all duration-150 border-2"
                  style={{
                    backgroundColor: selected ? '#58CC02' : '#ffffff',
                    borderColor: selected ? '#58CC02' : '#E5E7EB',
                    color: selected ? '#ffffff' : '#1B2D45',
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Interests — grouped chips */}
        {current.type === 'interests' && (
          <div className="max-w-2xl space-y-8">
            {INTERESTS_GROUPED.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-bold tracking-widest text-gray-400 mb-3">{group.category}</p>
                <div className="flex flex-wrap gap-2.5">
                  {group.items.map((item) => {
                    const selected = answers.interests.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggleInterest(item.id)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-150 border-2"
                        style={{
                          backgroundColor: selected ? '#58CC02' : '#ffffff',
                          borderColor: selected ? '#58CC02' : '#E5E7EB',
                          color: selected ? '#ffffff' : '#1B2D45',
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

        {/* Number input (days) */}
        {current.type === 'number' && (
          <div className="max-w-xs">
            <input
              type="number"
              placeholder="e.g. 3"
              value={answers.days}
              onChange={(e) => setAnswers((prev) => ({ ...prev, days: e.target.value }))}
              min="1"
              className="w-full px-5 py-4 rounded-2xl border-2 bg-white font-bold text-gray-900 placeholder:text-gray-300 outline-none transition-all"
              style={{
                fontSize: '24px',
                borderColor: answers.days ? '#58CC02' : '#E5E7EB',
              }}
            />
            <p className="text-sm text-gray-400 mt-3">Enter number of days (1–14)</p>
          </div>
        )}

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
