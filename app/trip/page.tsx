'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import StopCard from '@/components/StopCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { TripData } from '@/lib/types';

// Mapbox must be lazy-loaded (no SSR)
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />,
});

function TripContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const travelGroup = searchParams.get('travelGroup') || '';
  const stopTypes = searchParams.get('stopTypes') || '';
  const numberOfStops = searchParams.get('numberOfStops') || '';
  const stopDuration = searchParams.get('stopDuration') || '';
  const kidsAges = searchParams.get('kidsAges') || '';

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStop, setActiveStop] = useState(0);
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

  // Geocode a place name to coordinates using Mapbox
  async function geocode(place: string): Promise<[number, number]> {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?country=us&limit=1&access_token=${token}`
    );
    const data = await res.json();
    if (!data.features?.[0]) throw new Error(`Could not find "${place}"`);
    return data.features[0].center as [number, number]; // [lng, lat]
  }

  useEffect(() => {
    if (!start || !end) {
      router.push('/');
      return;
    }

    async function fetchTrip() {
      setLoading(true);
      setError('');

      try {
        // Geocode start and end in parallel with AI suggestion
        const [startCoord, endCoord, tripRes] = await Promise.all([
          geocode(start),
          geocode(end),
          fetch('/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end, travelGroup, stopTypes, numberOfStops, stopDuration, kidsAges }),
          }),
        ]);

        setStartCoords(startCoord);
        setEndCoords(endCoord);

        if (!tripRes.ok) {
          const errData = await tripRes.json();
          throw new Error(errData.error || 'Failed to get trip suggestions');
        }

        const tripData: TripData = await tripRes.json();
        setTrip(tripData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [start, end, travelGroup, stopTypes, numberOfStops, stopDuration, kidsAges, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="text-center">
          <LoadingSpinner message="Roady is finding the best stops for you..." />
          <p className="text-gray-400 text-sm mt-4">
            Planning: {start} → {end}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="text-center max-w-md">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#D85A30' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!trip || !startCoords || !endCoords) return null;

  return (
    <div className="h-screen flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b bg-white flex-shrink-0" style={{ borderColor: 'rgba(216,90,48,0.08)' }}>
        <button onClick={() => router.push('/')} className="font-extrabold text-xl tracking-tight" style={{ color: '#D85A30' }}>
          Roady
        </button>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{trip.routeName}</p>
          <p className="text-xs text-gray-400">{trip.tagline}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
          <span>{trip.stops.length} stops</span>
          <span className="w-px h-4 bg-gray-200" />
          <span>~{trip.totalMiles} mi</span>
        </div>
      </header>

      {/* Main content: map + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <RouteMap
            stops={trip.stops}
            start={startCoords}
            end={endCoords}
            activeStop={activeStop}
            onStopClick={setActiveStop}
          />
        </div>

        {/* Sidebar: stops */}
        <div className="w-[400px] flex-shrink-0 overflow-y-auto bg-[#FAFAF8] border-l border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1D9E75' }} />
            <p className="text-sm font-semibold text-gray-500">{start}</p>
          </div>

          {trip.stops.map((stop, i) => (
            <StopCard
              key={i}
              stop={stop}
              number={i + 1}
              isActive={activeStop === i}
              onClick={() => setActiveStop(i)}
            />
          ))}

          <div className="flex items-center gap-3 mt-2 px-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1B2D45' }} />
            <p className="text-sm font-semibold text-gray-500">{end}</p>
          </div>

          {/* Roady footer tip */}
          <div className="mt-6 mx-1 px-4 py-3 rounded-xl" style={{ backgroundColor: '#FDF6EE' }}>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <p className="text-xs font-medium leading-relaxed" style={{ color: '#993C1D' }}>
                Click any stop on the map or in this list to zoom in and learn more. Enjoy the drive!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}><LoadingSpinner /></div>}>
      <TripContent />
    </Suspense>
  );
}
