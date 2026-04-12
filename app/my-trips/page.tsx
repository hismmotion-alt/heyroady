'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import type { TripData } from '@/lib/types';

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

export default function MyTripsPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setTrips(data as SavedTrip[]);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('saved_trips').delete().eq('id', id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>My Trips</h1>
        <p className="text-gray-500 mb-10">Your saved road trips, ready to revisit.</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="font-bold text-lg mb-2" style={{ color: '#1B2D45' }}>No saved trips yet</p>
            <p className="text-gray-400 mb-6">Plan your first California road trip and save it here.</p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#58CC02' }}
            >
              Plan a trip →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h3 className="font-extrabold text-base" style={{ color: '#1B2D45' }}>
                    {trip.trip_data.routeName}
                  </h3>
                  <p className="text-sm text-gray-400">{trip.start} → {trip.end}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {trip.trip_data.stops.length} stop{trip.trip_data.stops.length !== 1 ? 's' : ''} · {trip.trip_data.totalMiles} miles
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => router.push(`/saved/${trip.id}`)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
                  >
                    View trip →
                  </button>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-400 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
