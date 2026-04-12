'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Destination } from '@/lib/types';

function SuggestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const start = searchParams.get('start') || '';
  const travelStyle = searchParams.get('travelStyle') || '';
  const interests = searchParams.get('interests') || '';
  const vibe = searchParams.get('vibe') || '';
  const days = searchParams.get('days') || '';
  const distance = searchParams.get('distance') || '';

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          travelStyle,
          interests: interests.split(',').filter(Boolean),
          vibe,
          days: Number(days),
          distance,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get suggestions');
      }
      const data = await res.json();
      setDestinations(data.destinations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [start, travelStyle, interests, vibe, days, distance]);

  useEffect(() => {
    if (!start) {
      router.push('/');
      return;
    }
    fetchDestinations();
  }, [fetchDestinations, router, start]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D85A30] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-lg" style={{ color: '#1B2D45' }}>
            Roady is finding your perfect destination...
          </p>
          <p className="text-sm text-gray-400 mt-2">This takes about 10 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center max-w-md px-6">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchDestinations}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#D85A30' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(253,246,238,0.92)', borderColor: 'rgba(216,90,48,0.08)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="font-extrabold text-xl tracking-tight"
          style={{ color: '#D85A30' }}
        >
          Roady
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
          Your perfect destinations
        </h1>
        <p className="text-gray-500 mb-10">
          Based on your preferences, here are 3 great matches from {start}.
        </p>

        <div className="space-y-6">
          {destinations.map((dest, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-extrabold" style={{ color: '#1B2D45' }}>
                    {dest.name}
                  </h2>
                  <p className="text-sm text-gray-400">{dest.region}</p>
                </div>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ml-4"
                  style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}
                >
                  {dest.matchScore}% match
                </span>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{dest.description}</p>

              <div className="space-y-2 mb-5 px-4 py-3 rounded-xl" style={{ backgroundColor: '#FDF6EE' }}>
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">✨</span>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>
                    {dest.whyMatch}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">🚗</span>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>
                    {dest.whyDrive}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  router.push(
                    `/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(dest.name)}`
                  )
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: '#D85A30' }}
              >
                Plan this trip →
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={fetchDestinations}
          className="mt-8 w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-80"
          style={{ backgroundColor: 'transparent', color: '#1B2D45', border: '2px solid #1B2D45' }}
        >
          Try different destinations
        </button>
      </div>
    </div>
  );
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#FDF6EE' }} />}>
      <SuggestionsContent />
    </Suspense>
  );
}
