'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import type { TripData } from '@/lib/types';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
});

interface TripPanelProps {
  tripData: TripData;
  start: string;
  end: string;
  startCoords: [number, number]; // [lng, lat]
  endCoords: [number, number];
}

export default function TripPanel({ tripData, start, end, startCoords, endCoords }: TripPanelProps) {
  const [activeStop, setActiveStop] = useState(-1);

  const formatDuration = (miles: number) => {
    const h = Math.floor(miles / 50);
    const m = Math.round(((miles / 50) - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const tripUrl = `/trip?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#993C1D' }}>Your trip</p>
          <p className="font-extrabold text-sm truncate" style={{ color: '#1B2D45' }}>
            {tripData.routeName}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs font-semibold" style={{ color: '#D85A30' }}>
              📍 {tripData.stops.length} stops
            </span>
            <span className="text-xs font-semibold" style={{ color: '#378ADD' }}>
              🛣 {tripData.totalMiles} mi · ~{formatDuration(tripData.totalMiles)}
            </span>
          </div>
        </div>
        <Link
          href={tripUrl}
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90 ml-3"
          style={{ backgroundColor: '#D85A30' }}
        >
          Full trip →
        </Link>
      </div>

      {/* Map */}
      <div className="flex-shrink-0" style={{ height: 180 }}>
        <RouteMap
          stops={tripData.stops}
          start={startCoords}
          end={endCoords}
          activeStop={activeStop}
          onStopClick={setActiveStop}
        />
      </div>

      {/* Stop list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {tripData.stops.map((stop, i) => {
          const isEnRoute = stop.stopType === 'en-route';
          const accent = isEnRoute ? '#D85A30' : '#378ADD';
          const isActive = activeStop === i;
          return (
            <button
              key={i}
              onClick={() => setActiveStop(isActive ? -1 : i)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all hover:bg-gray-50"
              style={{
                backgroundColor: isActive ? (isEnRoute ? 'rgba(216,90,48,0.06)' : 'rgba(55,138,221,0.06)') : 'transparent',
                borderLeft: `3px solid ${isActive ? accent : 'transparent'}`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: accent }}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate" style={{ color: '#1B2D45' }}>{stop.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{stop.city} · {stop.duration}</p>
              </div>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  backgroundColor: isEnRoute ? 'rgba(216,90,48,0.1)' : 'rgba(55,138,221,0.1)',
                  color: accent,
                }}
              >
                {isEnRoute ? 'Stop' : 'Spot'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
