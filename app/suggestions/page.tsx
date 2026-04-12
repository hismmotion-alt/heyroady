'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Destination } from '@/lib/types';

const STYLE_LABELS: Record<string, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Family-friendly',
  friends: 'With Friends',
};

type Badge = { label: string; bg: string; color: string };

function buildBadges(travelStyle: string, interests: string, distance: string): Badge[] {
  const badges: Badge[] = [];
  if (distance) badges.push({ label: distance, bg: 'rgba(55,138,221,0.1)', color: '#378ADD' });
  if (travelStyle && STYLE_LABELS[travelStyle])
    badges.push({ label: STYLE_LABELS[travelStyle], bg: 'rgba(29,158,117,0.1)', color: '#1D9E75' });
  const interestColors = [
    { bg: 'rgba(216,90,48,0.1)', color: '#D85A30' },
    { bg: 'rgba(147,51,234,0.1)', color: '#9333ea' },
  ];
  interests.split(',').filter(Boolean).slice(0, 2).forEach((i, idx) =>
    badges.push({ label: i.charAt(0).toUpperCase() + i.slice(1), ...interestColors[idx] })
  );
  return badges;
}

function DestinationCard({
  dest,
  badges,
  onPlan,
}: {
  dest: Destination;
  badges: Badge[];
  onPlan: () => void;
}) {
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(dest.name)}/800/480`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-default">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={dest.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: 'rgba(29,158,117,0.9)', color: '#ffffff' }}
        >
          {dest.matchScore}% match
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h2 className="text-lg font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
          {dest.name}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-2">{dest.region}</p>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
          {dest.description}
        </p>

        {/* Why match + why drive */}
        <div className="px-3 py-2.5 rounded-xl mb-3 space-y-1.5" style={{ backgroundColor: '#FDF6EE' }}>
          <div className="flex gap-1.5">
            <span className="text-sm flex-shrink-0">✨</span>
            <p className="text-xs font-medium leading-snug" style={{ color: '#993C1D' }}>
              {dest.whyMatch}
            </p>
          </div>
          <div className="flex gap-1.5">
            <span className="text-sm flex-shrink-0">🚗</span>
            <p className="text-xs font-medium leading-snug" style={{ color: '#993C1D' }}>
              {dest.whyDrive}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Animated Plan this trip button */}
        <button
          onClick={onPlan}
          className="mt-auto group/btn relative w-full px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 overflow-hidden"
          style={{
            backgroundColor: '#D85A30',
            color: '#ffffff',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
            btn.style.boxShadow = '0 14px 28px rgba(27,45,69,0.4), 0 6px 10px rgba(27,45,69,0.2)';
            btn.style.backgroundColor = '#1B2D45';
            btn.style.color = '#EF9F27';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.style.backgroundColor = '#D85A30';
            btn.style.color = '#ffffff';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'perspective(600px) rotateX(2deg) translateY(1px)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
          }}
        >
          <span className="absolute left-0 right-0 bottom-0 h-[4px] rounded-b-xl pointer-events-none bg-[#B04420] group-hover/btn:bg-[#0f1d30] transition-colors duration-300" />
          <span className="relative z-10 flex items-center gap-2">
            Plan this trip
            <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

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

  const badges: Badge[] = buildBadges(travelStyle, interests, distance);

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

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
          Your perfect destinations
        </h1>
        <p className="text-gray-500 mb-10">
          Based on your preferences, here are 3 great matches from {start}.
        </p>

        {/* Horizontal 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {destinations.map((dest, i) => (
            <DestinationCard
              key={i}
              dest={dest}
              badges={badges}
              onPlan={() =>
                router.push(
                  `/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(dest.name)}`
                )
              }
            />
          ))}
        </div>

        <button
          onClick={fetchDestinations}
          className="mt-10 w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-80"
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
