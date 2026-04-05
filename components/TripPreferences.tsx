'use client';

import { useState } from 'react';

export interface TripPreferences {
  travelGroup: string;
  kidsAges?: string[];
  stopTypes: string[];
  numberOfStops: string;
  stopDuration: string;
}

interface Props {
  onComplete: (prefs: TripPreferences) => void;
}

const TRAVEL_GROUPS = [
  { id: 'solo', label: 'Solo', desc: 'Just me and the open road', icon: '🎒' },
  { id: 'partner', label: 'With my partner', desc: 'A romantic getaway for two', icon: '💑' },
  { id: 'family-adults', label: 'Family (adults only)', desc: 'Quality time with the family', icon: '👨‍👩‍👦' },
  { id: 'family-kids', label: 'Family with kids', desc: 'Fun for all ages', icon: '👶' },
  { id: 'friends', label: 'Friends', desc: 'A crew adventure', icon: '🎉' },
];

const KIDS_AGES = [
  { id: 'baby-toddler', label: 'Baby & toddler', desc: '0–3 years old', icon: '🍼' },
  { id: 'little-kids', label: 'Little kids', desc: '4–7 years old', icon: '🧸' },
  { id: 'kids', label: 'Kids', desc: '8–12 years old', icon: '🎮' },
  { id: 'teens', label: 'Teens', desc: '13–17 years old', icon: '🎧' },
];

const STOP_TYPES = [
  { id: 'food', label: 'Food & dining', desc: 'Local eats and hidden kitchens', icon: '🍽️' },
  { id: 'nature', label: 'Nature & outdoors', desc: 'Trails, parks, and fresh air', icon: '🌲' },
  { id: 'museums', label: 'Museums & culture', desc: 'Art, history, and exhibits', icon: '🏛️' },
  { id: 'scenic', label: 'Scenic views', desc: 'Lookouts and photo spots', icon: '📸' },
  { id: 'adventure', label: 'Adventure & thrills', desc: 'Surfing, hiking, and more', icon: '🏄' },
  { id: 'beaches', label: 'Beaches & water', desc: 'Coastline and lakeside stops', icon: '🏖️' },
  { id: 'shopping', label: 'Shopping & markets', desc: 'Local shops and farmers markets', icon: '🛍️' },
  { id: 'history', label: 'History & landmarks', desc: 'Iconic sites and stories', icon: '🏰' },
];

const STOP_COUNTS = [
  { id: '1', label: '1 stop', desc: 'Quick and focused', icon: '1️⃣' },
  { id: '2', label: '2 stops', desc: 'A couple of highlights', icon: '2️⃣' },
  { id: '3', label: '3 stops', desc: 'A nice balance', icon: '3️⃣' },
  { id: '4', label: '4 stops', desc: 'Plenty to explore', icon: '4️⃣' },
  { id: '5', label: '5 stops', desc: 'The full experience', icon: '5️⃣' },
  { id: 'auto', label: 'Choose for me', desc: 'Let Roady decide the best number', icon: '✨' },
];

const DURATIONS = [
  { id: 'quick', label: 'Quick stops', desc: '15–30 minutes each', icon: '⚡' },
  { id: 'moderate', label: 'Take it easy', desc: '1–2 hours each', icon: '☕' },
  { id: 'deep', label: 'Deep dive', desc: '2+ hours to really explore', icon: '🔍' },
  { id: 'mix', label: 'Mix it up', desc: 'A blend of quick and long stops', icon: '🎯' },
];

export default function TripPreferencesForm({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [travelGroup, setTravelGroup] = useState('');
  const [kidsAges, setKidsAges] = useState<string[]>([]);
  const [stopTypes, setStopTypes] = useState<string[]>([]);
  const [numberOfStops, setNumberOfStops] = useState('');
  const [stopDuration, setStopDuration] = useState('');

  const showKidsStep = travelGroup === 'family-kids';
  // Steps: group → (kids ages?) → stop types → number of stops → duration
  const steps = showKidsStep
    ? ['group', 'kids', 'stopTypes', 'numberOfStops', 'duration']
    : ['group', 'stopTypes', 'numberOfStops', 'duration'];
  const totalSteps = steps.length;
  const currentStepId = steps[step];
  const progress = ((step + 1) / totalSteps) * 100;

  function canContinue(): boolean {
    switch (currentStepId) {
      case 'group': return !!travelGroup;
      case 'kids': return kidsAges.length > 0;
      case 'stopTypes': return stopTypes.length > 0;
      case 'numberOfStops': return !!numberOfStops;
      case 'duration': return !!stopDuration;
      default: return false;
    }
  }

  function handleNext() {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete({
        travelGroup,
        ...(showKidsStep && { kidsAges }),
        stopTypes,
        numberOfStops,
        stopDuration,
      });
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function toggleMulti(id: string, arr: string[], setter: (v: string[]) => void, max?: number) {
    if (arr.includes(id)) {
      setter(arr.filter((x) => x !== id));
    } else if (!max || arr.length < max) {
      setter([...arr, id]);
    }
  }

  // Card component
  function OptionCard({
    item,
    selected,
    onClick,
    multi,
  }: {
    item: { id: string; label: string; desc: string; icon: string };
    selected: boolean;
    onClick: () => void;
    multi?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left group"
        style={{
          borderColor: selected ? '#D85A30' : '#E5E7EB',
          backgroundColor: selected ? 'rgba(216,90,48,0.04)' : 'white',
        }}
      >
        <span className="text-2xl flex-shrink-0">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px]" style={{ color: '#1B2D45' }}>{item.label}</p>
          <p className="text-sm text-gray-400">{item.desc}</p>
        </div>
        <div
          className="w-6 h-6 flex-shrink-0 border-2 flex items-center justify-center transition-all"
          style={{
            borderRadius: multi ? '6px' : '50%',
            borderColor: selected ? '#D85A30' : '#D1D5DB',
            backgroundColor: selected ? '#D85A30' : 'transparent',
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <span className="font-extrabold text-xl tracking-tight" style={{ color: '#D85A30' }}>
          Roady
        </span>
        <span className="text-sm font-semibold text-gray-400">
          {step + 1} of {totalSteps}
        </span>
      </header>

      {/* Progress bar */}
      <div className="px-6 pb-6">
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: '#D85A30' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6">
        <div className="w-full max-w-lg">
          {/* Step: Travel Group */}
          {currentStepId === 'group' && (
            <>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                Who&apos;s coming along?
              </h2>
              <p className="text-gray-400 mb-8">
                This helps Roady find the right kind of stops for your crew.
              </p>
              <div className="flex flex-col gap-3">
                {TRAVEL_GROUPS.map((g) => (
                  <OptionCard
                    key={g.id}
                    item={g}
                    selected={travelGroup === g.id}
                    onClick={() => setTravelGroup(g.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Step: Kids Ages */}
          {currentStepId === 'kids' && (
            <>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                How old are the kids?
              </h2>
              <p className="text-gray-400 mb-8">
                Select all that apply so we find age-appropriate stops.
              </p>
              <div className="flex flex-col gap-3">
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
            </>
          )}

          {/* Step: Stop Types */}
          {currentStepId === 'stopTypes' && (
            <>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                What kind of stops interest you?
              </h2>
              <p className="text-gray-400 mb-8">
                Pick up to 3 that match your vibe.
              </p>
              <div className="flex flex-col gap-3">
                {STOP_TYPES.map((t) => (
                  <OptionCard
                    key={t.id}
                    item={t}
                    selected={stopTypes.includes(t.id)}
                    onClick={() => toggleMulti(t.id, stopTypes, setStopTypes, 3)}
                    multi
                  />
                ))}
              </div>
            </>
          )}

          {/* Step: Number of Stops */}
          {currentStepId === 'numberOfStops' && (
            <>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                How many stops would you like?
              </h2>
              <p className="text-gray-400 mb-8">
                More stops means more to see — fewer means more time at each.
              </p>
              <div className="flex flex-col gap-3">
                {STOP_COUNTS.map((c) => (
                  <OptionCard
                    key={c.id}
                    item={c}
                    selected={numberOfStops === c.id}
                    onClick={() => setNumberOfStops(c.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Step: Duration */}
          {currentStepId === 'duration' && (
            <>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                How much time at each stop?
              </h2>
              <p className="text-gray-400 mb-8">
                This helps Roady plan the right pace for your trip.
              </p>
              <div className="flex flex-col gap-3">
                {DURATIONS.map((d) => (
                  <OptionCard
                    key={d.id}
                    item={d}
                    selected={stopDuration === d.id}
                    onClick={() => setStopDuration(d.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="px-6 py-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <button
          onClick={handleBack}
          className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canContinue()}
          className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#D85A30' }}
        >
          {step === totalSteps - 1 ? 'Plan My Trip' : 'Continue'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}