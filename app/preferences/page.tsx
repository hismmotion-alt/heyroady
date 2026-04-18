'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TripPreferencesForm from '@/components/TripPreferences';
import type { TripPreferences } from '@/lib/types';

// Map suggest wizard travelStyle → TripPreferences travelGroup
const STYLE_TO_GROUP: Record<string, string> = {
  solo: 'solo',
  couple: 'partner',
  family: 'family-kids',
  friends: 'friends',
};

// Map suggest wizard interests → STOP_TYPES ids
const INTEREST_TO_STOP: Record<string, string> = {
  nature: 'nature',
  food: 'food',
  'local-food': 'food',
  culture: 'museums',
  adventure: 'adventure',
  beaches: 'beaches',
  hiking: 'nature',
  camping: 'nature',
  wildlife: 'nature',
  sunsets: 'scenic',
  surf: 'beaches',
  wine: 'food',
  coffee: 'food',
  breweries: 'food',
  bakeries: 'food',
  history: 'history',
  art: 'museums',
  photography: 'scenic',
  boutique: 'shopping',
  'boutique-shops': 'shopping',
  museums: 'museums',
  scenic: 'scenic',
  'national-parks': 'nature',
  'road-stops': 'scenic',
};

function PreferencesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const travelStyle = searchParams.get('travelStyle') || '';
  const interests = searchParams.get('interests') || '';
  const vibe = searchParams.get('vibe') || '';
  const distance = searchParams.get('distance') || '';
  const waypoints = searchParams.get('waypoints') || '';

  if (!start || !end) {
    router.push('/');
    return null;
  }

  const prefilledGroup = travelStyle ? STYLE_TO_GROUP[travelStyle] : undefined;
  const prefilledStopTypes = interests
    ? interests.split(',').filter(Boolean).map((i) => INTEREST_TO_STOP[i]).filter(Boolean)
    : undefined;

  function handleComplete(prefs: TripPreferences) {
    const params = new URLSearchParams({
      start,
      end,
      travelGroup: prefs.travelGroup,
      stopTypes: prefs.stopTypes.join(','),
      numberOfStops: prefs.numberOfStops,
      stopDuration: prefs.stopDuration,
    });
    if (prefs.kidsAges && prefs.kidsAges.length > 0) {
      params.set('kidsAges', prefs.kidsAges.join(','));
    }
    if (prefs.hotelPreference) params.set('hotelPreference', prefs.hotelPreference);
    if (prefs.hotelGuests) params.set('hotelGuests', prefs.hotelGuests);
    if (prefs.hotelCheckin) params.set('hotelCheckin', prefs.hotelCheckin);
    if (prefs.hotelNights) params.set('hotelNights', prefs.hotelNights);
    if (waypoints) params.set('waypoints', waypoints);
    if (vibe) params.set('vibe', vibe);
    if (distance) params.set('distance', distance);
    if (interests) params.set('interests', interests);
    router.push(`/trip?${params.toString()}`);
  }

  return (
    <TripPreferencesForm
      onComplete={handleComplete}
      prefilledGroup={prefilledGroup}
      prefilledStopTypes={prefilledStopTypes && prefilledStopTypes.length > 0 ? prefilledStopTypes : undefined}
    />
  );
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#58CC02' }} />
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
