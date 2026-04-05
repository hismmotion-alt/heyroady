'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TripPreferencesForm from '@/components/TripPreferences';
import type { TripPreferences } from '@/lib/types';

function PreferencesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  if (!start || !end) {
    router.push('/');
    return null;
  }

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
    router.push(`/trip?${params.toString()}`);
  }

  return <TripPreferencesForm onComplete={handleComplete} />;
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#D85A30' }} />
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
