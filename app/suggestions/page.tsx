'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Destination } from '@/lib/types';
import Navbar from '@/components/Navbar';

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
    badges.push({ label: STYLE_LABELS[travelStyle], bg: 'rgba(88,204,2,0.12)', color: '#46a302' });
  const interestColors = [
    { bg: 'rgba(88,204,2,0.1)', color: '#58CC02' },
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
          style={{ backgroundColor: 'rgba(88,204,2,0.9)', color: '#ffffff' }}
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

        {/* Roady says callout */}
        <div className="px-3 py-2.5 rounded-xl mb-3" style={{ backgroundColor: '#FDF6EE', borderLeft: '3px solid #EF9F27' }}>
          <p className="text-xs leading-snug" style={{ color: '#993C1D' }}>
            <strong className="font-bold">Roady says:</strong> {dest.whyMatch}
            {dest.whyDrive && <> {dest.whyDrive}</>}
          </p>
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
            backgroundColor: '#58CC02',
            color: '#ffffff',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
            btn.style.boxShadow = '0 14px 28px rgba(58,173,0,0.35), 0 6px 10px rgba(58,173,0,0.2)';
            btn.style.backgroundColor = '#3aad00';
            btn.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.transform = '';
            btn.style.boxShadow = '';
            btn.style.backgroundColor = '#58CC02';
            btn.style.color = '#ffffff';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'perspective(600px) rotateX(2deg) translateY(1px)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
          }}
        >
          <span className="absolute left-0 right-0 bottom-0 h-[4px] rounded-b-xl pointer-events-none bg-[#46a302] group-hover/btn:bg-[#3aad00] transition-colors duration-300" />
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
        style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
        style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <div className="text-center max-w-md px-6">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchDestinations}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#58CC02' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tweakUrl = `/suggest?start=${encodeURIComponent(start)}`;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        {/* Answer-echo bar */}
        <div className="rounded-2xl p-4 mb-8 flex items-start justify-between gap-4 flex-wrap" style={{ background: 'linear-gradient(135deg, rgba(88,204,2,0.08), #fff)', border: '1px solid #E5E7EB' }}>
          <div>
            <p className="font-extrabold text-base mb-2" style={{ color: '#1B2D45' }}>Roady picked 3 spots for you 🌲</p>
            <div className="flex flex-wrap gap-1.5">
              {start && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-gray-200" style={{ color: '#1B2D45' }}>From {start}</span>}
              {travelStyle && STYLE_LABELS[travelStyle] && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-gray-200" style={{ color: '#1B2D45' }}>{STYLE_LABELS[travelStyle]}</span>}
              {interests && interests.split(',').filter(Boolean).map((i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-gray-200" style={{ color: '#1B2D45' }}>{i.charAt(0).toUpperCase() + i.slice(1)}</span>
              ))}
              {days && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-gray-200" style={{ color: '#1B2D45' }}>{days} days</span>}
              {distance && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-gray-200" style={{ color: '#1B2D45' }}>≤{distance}</span>}
            </div>
          </div>
          <a href={tweakUrl} className="text-sm font-bold whitespace-nowrap transition-colors" style={{ color: '#46a302' }}>✎ Tweak answers</a>
        </div>

        {/* Horizontal 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {destinations.map((dest, i) => (
            <DestinationCard
              key={i}
              dest={dest}
              badges={badges}
              onPlan={() => {
                const params = new URLSearchParams({ start, end: dest.name });
                if (travelStyle) params.set('travelStyle', travelStyle);
                if (interests) params.set('interests', interests);
                router.push(`/preferences?${params.toString()}`);
              }}
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
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#ffffff' }} />}>
      <SuggestionsContent />
    </Suspense>
  );
}
