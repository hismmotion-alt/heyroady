'use client';

import { useState, useEffect, useRef } from 'react';
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

const PARTICLE_COLORS = ['#58CC02', '#46a302', '#7ee828', '#FFD700', '#FF6B35'];

const CATEGORY_META: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  nature:    { emoji: '🌿', label: 'Nature',    bg: 'rgba(29,158,117,0.1)',  color: '#1D9E75' },
  food:      { emoji: '🍴', label: 'Food',      bg: 'rgba(239,159,39,0.1)', color: '#EF9F27' },
  culture:   { emoji: '🏛️', label: 'Culture',   bg: 'rgba(147,51,234,0.1)', color: '#7c3aed' },
  adventure: { emoji: '🏕️', label: 'Adventure', bg: 'rgba(216,90,48,0.1)',  color: '#D85A30' },
  scenic:    { emoji: '🌄', label: 'Scenic',    bg: 'rgba(55,138,221,0.1)', color: '#378ADD' },
};

function Particles({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const dist = 28 + Math.random() * 14;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = Math.sin((angle * Math.PI) / 180) * dist;
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    return { tx, ty, color };
  });

  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: p.color,
            top: '50%',
            left: '50%',
            marginTop: -3,
            marginLeft: -3,
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
            animation: 'particleFly 0.5s ease-out forwards',
            animationDelay: `${i * 20}ms`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const handleToggleCompleted = async (id: string) => {
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    const completed = !trip.trip_data.completed;
    const updatedData = { ...trip.trip_data, completed };
    const supabase = createClient();
    await supabase.from('saved_trips').update({ trip_data: updatedData }).eq('id', id);
    setTrips((prev) => prev.map((t) => t.id === id ? { ...t, trip_data: updatedData } : t));

    if (completed) {
      setAnimatingId(id);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setAnimatingId(null), 700);
    }
  };

  const completedCount = trips.filter((t) => !!t.trip_data.completed).length;
  const pendingCount = trips.length - completedCount;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>My Trips</h1>
        <p className="text-gray-500 mb-3">Your saved road trips, ready to revisit.</p>

        {/* Stats */}
        {!loading && trips.length > 0 && (
          <div className="flex gap-4 mb-8">
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(88,204,2,0.1)', color: '#46a302' }}>
              ✓ Completed {completedCount}
            </span>
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(27,45,69,0.06)', color: '#1B2D45' }}>
              ⏳ Pending {pendingCount}
            </span>
          </div>
        )}

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
            {trips.map((trip) => {
              const completed = !!trip.trip_data.completed;
              const isAnimating = animatingId === trip.id;
              const vibeCategories = [...new Set(trip.trip_data.stops.map((s) => s.category))];
              return (
                <div
                  key={trip.id}
                  className="rounded-2xl shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-all relative"
                  style={{
                    backgroundColor: completed ? '#f0fce4' : '#ffffff',
                    border: completed ? '1.5px solid rgba(88,204,2,0.35)' : '1.5px solid #f0f0f0',
                  }}
                >
                  {/* Completed toggle — top right */}
                  <div className="absolute top-4 right-4" style={{ position: 'absolute' }}>
                    <button
                      onClick={() => handleToggleCompleted(trip.id)}
                      title={completed ? 'Mark as not completed' : 'Mark as completed'}
                      className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: completed ? '#58CC02' : '#d1d5db',
                        backgroundColor: completed ? '#58CC02' : 'transparent',
                        animation: isAnimating ? 'completePop 0.4s ease-out' : 'none',
                        position: 'relative',
                      }}
                    >
                      {completed && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <Particles active={isAnimating} />
                    </button>
                  </div>

                  <div className="pr-8">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <h3 className="font-extrabold text-base mb-0.5" style={{ color: '#1B2D45' }}>
                      {trip.trip_data.routeName}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      🚗 {trip.start} → 🏁 {trip.end}
                    </p>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(216,90,48,0.08)', color: '#D85A30' }}>
                        📍 {trip.trip_data.stops.length} stop{trip.trip_data.stops.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(55,138,221,0.08)', color: '#378ADD' }}>
                        🛣 {trip.trip_data.totalMiles} mi
                      </span>
                      {completed && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(88,204,2,0.15)', color: '#46a302' }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    {/* Vibe tags */}
                    {vibeCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {vibeCategories.map((cat) => {
                          const meta = CATEGORY_META[cat];
                          if (!meta) return null;
                          return (
                            <span key={cat} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>
                              {meta.emoji} {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
