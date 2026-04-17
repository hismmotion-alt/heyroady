'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StopCard from '@/components/StopCard';
import type { TripData, Stop } from '@/lib/types';

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
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [suggestingIdx, setSuggestingIdx] = useState<number | null>(null);
  const [addingStop, setAddingStop] = useState(false);

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

  const persistStops = async (newStops: Stop[]) => {
    if (!trip) return;
    const updatedData = { ...trip.trip_data, stops: newStops };
    const supabase = createClient();
    await supabase.from('saved_trips').update({ trip_data: updatedData }).eq('id', id);
    setTrip({ ...trip, trip_data: updatedData });
  };

  const handleDeleteStop = async (idx: number) => {
    if (!trip) return;
    const newStops = trip.trip_data.stops.filter((_, i) => i !== idx);
    await persistStops(newStops);
    setActiveStop(null);
  };

  const handleSuggestStop = async (idx: number, preferredCategory?: string) => {
    if (!trip) return;
    setSuggestingIdx(idx);
    try {
      const res = await fetch('/api/suggest-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: trip.start,
          end: trip.end,
          currentStops: trip.trip_data.stops,
          position: idx,
          preferredCategory,
        }),
      });
      if (!res.ok) return;
      const newStop: Stop = await res.json();
      const newStops = [...trip.trip_data.stops];
      newStops[idx] = newStop;
      await persistStops(newStops);
      setActiveStop(idx);
    } finally {
      setSuggestingIdx(null);
    }
  };

  const handleAddStop = async () => {
    if (!trip) return;
    setAddingStop(true);
    const insertAt = trip.trip_data.stops.length;
    try {
      const res = await fetch('/api/suggest-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: trip.start,
          end: trip.end,
          currentStops: trip.trip_data.stops,
          position: insertAt,
        }),
      });
      if (!res.ok) return;
      const newStop: Stop = await res.json();
      const newStops = [...trip.trip_data.stops, newStop];
      await persistStops(newStops);
      setActiveStop(newStops.length - 1);
    } finally {
      setAddingStop(false);
    }
  };

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

        {/* Route: start → stops → end */}
        <div className="flex flex-col">
          {/* Start */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(88,204,2,0.06)', border: '1.5px solid rgba(88,204,2,0.2)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: 'rgba(88,204,2,0.15)' }}>
              🚗
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#46a302' }}>Starting point</p>
              <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{trip.start}</p>
            </div>
          </div>

          {/* Stops via StopCard */}
          {stops.map((stop, i) => (
            <div key={i}>
              <div className="px-6 py-1">
                <div className="w-px h-4" style={{ backgroundColor: '#e5e7eb' }} />
              </div>
              <StopCard
                stop={stop}
                number={i + 1}
                isActive={activeStop === i}
                onClick={() => setActiveStop(activeStop === i ? null : i)}
                onDelete={() => handleDeleteStop(i)}
                onSuggestNew={() => handleSuggestStop(i)}
                onSuggestByCategory={(cat) => handleSuggestStop(i, cat)}
                isSuggesting={suggestingIdx === i}
              />
            </div>
          ))}

          {/* Add stop */}
          <div className="px-6 py-1">
            <div className="w-px h-4" style={{ backgroundColor: '#e5e7eb' }} />
          </div>
          <button
            onClick={handleAddStop}
            disabled={addingStop}
            className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all hover:border-[#58CC02] hover:text-[#46a302] disabled:opacity-50"
            style={{ borderColor: '#d1d5db', color: '#9ca3af' }}
          >
            {addingStop ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#58CC02] border-t-transparent rounded-full animate-spin inline-block" />
                Finding a stop…
              </span>
            ) : '+ Add a stop'}
          </button>

          {/* Connector to end */}
          <div className="px-6 py-1">
            <div className="w-px h-4" style={{ backgroundColor: '#e5e7eb' }} />
          </div>

          {/* End */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(27,45,69,0.05)', border: '1.5px solid rgba(27,45,69,0.12)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: 'rgba(27,45,69,0.1)' }}>
              🏁
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Final destination</p>
              <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{trip.end}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
