'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StopCard from '@/components/StopCard';
import type { TripData } from '@/lib/types';

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

export default function SavedTripPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setTrip(data as SavedTrip); }
        setLoading(false);
      });
  }, [id]);

  const buildMapsUrls = (trip: SavedTrip) => {
    const stops = trip.trip_data.stops;
    const allPoints = [trip.start, ...stops.map((s) => s.city), trip.end];
    const googleUrl = 'https://www.google.com/maps/dir/' + allPoints.map(encodeURIComponent).join('/');
    const appleDaddr = [...stops.map((s) => encodeURIComponent(s.city)), encodeURIComponent(trip.end)].join('+to:');
    const appleUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(trip.start)}&daddr=${appleDaddr}`;
    return { googleUrl, appleUrl };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-10 h-10 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="font-bold text-lg mb-2" style={{ color: '#1B2D45' }}>Trip not found</p>
          <p className="text-gray-400 mb-6">This trip may have been deleted or doesn&apos;t exist.</p>
          <button onClick={() => router.push('/my-trips')} className="px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: '#58CC02' }}>
            My Trips
          </button>
        </div>
      </div>
    );
  }

  const { googleUrl, appleUrl } = buildMapsUrls(trip);
  const { routeName, tagline, totalMiles, stops } = trip.trip_data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        {/* Back */}
        <button onClick={() => router.push('/my-trips')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 transition-colors">
          ← My Trips
        </button>

        {/* Header */}
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#1B2D45' }}>{routeName}</h1>
        <p className="text-gray-500 mb-2">{tagline}</p>
        <p className="text-sm text-gray-400 mb-8">{trip.start} → {trip.end} · {totalMiles} miles · {stops.length} stops</p>

        {/* Open in Maps */}
        <div className="flex gap-3 mb-10">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90"
            style={{ backgroundColor: '#58CC02', color: '#ffffff' }}>
            Open in Google Maps
          </a>
          <a href={appleUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-3 rounded-xl font-bold text-sm text-center border-2 transition-all hover:border-[#58CC02] hover:text-[#46a302]"
            style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}>
            Open in Apple Maps
          </a>
        </div>

        {/* Stops */}
        <div className="flex flex-col gap-4">
          {stops.map((stop, i) => (
            <StopCard key={i} stop={stop} number={i + 1} isActive={false} isFirst={i === 0} isLast={i === stops.length - 1} onClick={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}
