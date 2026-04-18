'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import StopCard from '@/components/StopCard';
import HotelCard from '@/components/HotelCard';
import type { TripData, Stop } from '@/lib/types';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />,
});

function SortableStopCard(props: React.ComponentProps<typeof StopCard> & { id: string }) {
  const { id, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      <StopCard {...rest} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

const CATEGORY_STYLES: Record<string, { gradient: string; emoji: string; label: string; color: string }> = {
  nature:    { gradient: 'linear-gradient(135deg,#A9DFBF,#27AE60)', emoji: '🌿', label: 'Nature',    color: '#1D9E75' },
  food:      { gradient: 'linear-gradient(135deg,#F8C471,#E67E22)', emoji: '🍴', label: 'Food',      color: '#EF9F27' },
  culture:   { gradient: 'linear-gradient(135deg,#F4D03F,#B7950B)', emoji: '🏛️', label: 'Culture',   color: '#7c3aed' },
  adventure: { gradient: 'linear-gradient(135deg,#5DADE2,#2E86C1)', emoji: '🏕️', label: 'Adventure', color: '#D85A30' },
  scenic:    { gradient: 'linear-gradient(135deg,#48C9B0,#1B4F72)', emoji: '🌄', label: 'Scenic',    color: '#378ADD' },
};

const PACK_ITEMS_BASE = [
  'Sunscreen + sunglasses',
  'Reusable water bottle',
  'Snacks for the road',
  'Portable charger / power bank',
  'Car phone mount for navigation',
  'First aid kit',
  'Cash for small vendors & markets',
  'Downloaded offline maps',
];

const PACK_EXTRAS: Record<string, string[]> = {
  adventure: ['Hiking shoes', 'Headlamp', 'Layers (big temp swings)', 'Rain shell'],
  nature:    ['Insect repellent', 'Trail snacks', 'Extra water'],
  food:      ['Cooler for market finds'],
  culture:   ['Comfortable walking shoes', 'Camera'],
  scenic:    ['Camera / phone lens', 'Binoculars'],
};

const CHECKLIST_ITEMS = [
  'Entry reservations (national parks)',
  'Hotel confirmation',
  'Fuel up before remote areas',
  'Download offline maps',
  'Pack layers — CA temps vary',
];

const LOCATION_OVERRIDES: Record<string, [number, number]> = {
  'Anaheim': [-117.9145, 33.8353],
  'Bakersfield': [-119.0187, 35.3733],
  'Berkeley': [-122.2727, 37.8715],
  'Beverly Hills': [-118.4065, 34.0901],
  'Big Sur': [-121.4247, 36.2704],
  'Carmel-by-the-Sea': [-121.9225, 36.5526],
  'Carmel': [-121.9225, 36.5526],
  'Death Valley': [-116.8325, 36.5054],
  'Eureka': [-124.1637, 40.8021],
  'Fresno': [-119.7674, 36.7378],
  'Half Moon Bay': [-122.4280, 37.4829],
  'Joshua Tree': [-116.3087, 34.1356],
  'La Jolla': [-117.2710, 32.8455],
  'Laguna Beach': [-117.7831, 33.5427],
  'Lake Tahoe': [-120.0681, 39.0968],
  'Long Beach': [-118.1937, 33.7701],
  'Los Angeles': [-118.2437, 34.0522],
  'Malibu': [-118.6816, 34.0282],
  'Mammoth Lakes': [-118.9723, 37.6304],
  'Mendocino': [-123.7980, 39.2968],
  'Monterey': [-121.8863, 36.6002],
  'Napa': [-122.2869, 38.2975],
  'Oakland': [-122.2727, 37.8044],
  'Ojai': [-119.2419, 34.4348],
  'Pacific Grove': [-121.9188, 36.6274],
  'Palm Springs': [-116.5453, 33.8303],
  'Palo Alto': [-122.1430, 37.4419],
  'Paso Robles': [-120.6625, 35.6391],
  'Pismo Beach': [-120.6428, 35.1435],
  'Redding': [-122.5907, 40.5865],
  'Sacramento': [-121.4944, 38.5816],
  'San Diego': [-117.1611, 32.7157],
  'San Francisco': [-122.4194, 37.7749],
  'San Jose': [-121.8863, 37.3382],
  'San Luis Obispo': [-120.6625, 35.2828],
  'San Simeon': [-121.1794, 35.6464],
  'Santa Barbara': [-119.6982, 34.4208],
  'Santa Cruz': [-122.0709, 36.9741],
  'Santa Monica': [-118.4912, 34.0195],
  'Santa Rosa': [-122.7159, 38.4405],
  'Sausalito': [-122.4580, 37.8599],
  'Sequoia National Park': [-118.7604, 36.4864],
  'Solvang': [-120.1387, 34.5947],
  'Sonoma': [-122.4580, 38.2919],
  'South Lake Tahoe': [-120.0329, 38.9557],
  'Temecula': [-117.1486, 33.7347],
  'Ventura': [-119.2919, 34.2805],
  'Yosemite': [-119.5783, 37.8715],
};

async function geocode(place: string): Promise<[number, number]> {
  if (LOCATION_OVERRIDES[place]) return LOCATION_OVERRIDES[place];
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const searchQuery = place.includes(',') ? place : `${place}, California`;
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=us&proximity=-119.4179,36.7783&limit=1&access_token=${token}`
  );
  const data = await res.json();
  if (!data.features?.[0]) {
    const fallback = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?country=us&limit=1&access_token=${token}`
    );
    const fData = await fallback.json();
    if (!fData.features?.[0]) throw new Error(`Could not find "${place}"`);
    return fData.features[0].center as [number, number];
  }
  return data.features[0].center as [number, number];
}

function formatDuration(miles: number) {
  const hours = miles / 50;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function driveLabel(lat1: number, lng1: number, lat2: number, lng2: number) {
  const miles = haversineDistance(lat1, lng1, lat2, lng2) * 1.3;
  return `~${formatDuration(miles)} drive`;
}

export default function SavedTripPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [savedTrip, setSavedTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'stops' | 'stays' | 'map' | 'tips'>('overview');
  const [activeStop, setActiveStop] = useState(0);
  const [stopFilter, setStopFilter] = useState<string | null>(null);
  const [suggestingIdx, setSuggestingIdx] = useState<number | null>(null);
  const [addingStop, setAddingStop] = useState(false);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState<number | null>(null);
  const [overviewHotelIdx, setOverviewHotelIdx] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set<string>());
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const trip = data as SavedTrip;
        setSavedTrip(trip);
        Promise.all([geocode(trip.start), geocode(trip.end)]).then(([sc, ec]) => {
          setStartCoords(sc);
          setEndCoords(ec);
        }).catch(() => {});
        setLoading(false);
      });
  }, [id]);

  const persistStops = async (newStops: Stop[]) => {
    if (!savedTrip) return;
    const updatedData = { ...savedTrip.trip_data, stops: newStops };
    const supabase = createClient();
    await supabase.from('saved_trips').update({ trip_data: updatedData }).eq('id', id);
    setSavedTrip({ ...savedTrip, trip_data: updatedData });
  };

  const handleDeleteStop = async (idx: number) => {
    if (!savedTrip) return;
    const newStops = savedTrip.trip_data.stops.filter((_, i) => i !== idx);
    await persistStops(newStops);
    if (activeStop >= idx && activeStop > 0) setActiveStop(activeStop - 1);
  };

  const handleSuggestStop = async (idx: number, preferredCategory?: string) => {
    if (!savedTrip) return;
    setSuggestingIdx(idx);
    try {
      const res = await fetch('/api/suggest-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: savedTrip.start,
          end: savedTrip.end,
          currentStops: savedTrip.trip_data.stops,
          position: idx,
          preferredCategory,
        }),
      });
      if (!res.ok) return;
      const newStop: Stop = await res.json();
      const newStops = [...savedTrip.trip_data.stops];
      newStops[idx] = newStop;
      await persistStops(newStops);
      setActiveStop(idx);
    } finally {
      setSuggestingIdx(null);
    }
  };

  const handleAddStop = async () => {
    if (!savedTrip) return;
    setAddingStop(true);
    const insertAt = savedTrip.trip_data.stops.length;
    try {
      const res = await fetch('/api/suggest-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: savedTrip.start,
          end: savedTrip.end,
          currentStops: savedTrip.trip_data.stops,
          position: insertAt,
        }),
      });
      if (!res.ok) return;
      const newStop: Stop = await res.json();
      const newStops = [...savedTrip.trip_data.stops, newStop];
      await persistStops(newStops);
      setActiveStop(newStops.length - 1);
    } finally {
      setAddingStop(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !savedTrip) return;
    const stops = savedTrip.trip_data.stops;
    const oldIndex = stops.findIndex((_, i) => `stop-${i}` === active.id);
    const newIndex = stops.findIndex((_, i) => `stop-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newStops = arrayMove(stops, oldIndex, newIndex);
    persistStops(newStops);
    setActiveStop(newIndex);
  };

  const handleSelectHotel = async (idx: number) => {
    if (selectedHotelIdx === idx) {
      setSelectedHotelIdx(null);
      if (savedTrip) {
        try { setEndCoords(await geocode(savedTrip.end)); } catch { /* skip */ }
      }
      return;
    }
    setSelectedHotelIdx(idx);
    const hotel = savedTrip?.trip_data?.hotels?.[idx];
    if (!hotel) return;
    if (hotel.lat && hotel.lng) {
      setEndCoords([hotel.lng, hotel.lat]);
    } else {
      try { setEndCoords(await geocode(`${hotel.name}, ${hotel.city}`)); } catch { /* skip */ }
    }
  };

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set<string>(Array.from(prev));
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };

  const buildMapsUrls = () => {
    if (!savedTrip) return { googleUrl: '#', appleUrl: '#' };
    const stops = savedTrip.trip_data.stops;
    const googlePoints = [
      encodeURIComponent(savedTrip.start),
      ...stops.map((s) => s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.city)),
      encodeURIComponent(savedTrip.end),
    ];
    const googleUrl = 'https://www.google.com/maps/dir/' + googlePoints.join('/');
    const appleDaddr = [
      ...stops.map((s) => s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(s.city)),
      encodeURIComponent(savedTrip.end),
    ].join('+to:');
    const appleUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(savedTrip.start)}&daddr=${appleDaddr}`;
    return { googleUrl, appleUrl };
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FDF6EE' }}>
        <div className="w-10 h-10 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !savedTrip) {
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

  const trip = savedTrip.trip_data;
  const start = savedTrip.start;
  const end = savedTrip.end;

  const uniqueCategories = trip.stops
    .map((s) => s.category)
    .filter((cat, idx, arr) => arr.indexOf(cat) === idx);

  const packList = PACK_ITEMS_BASE.concat(
    uniqueCategories
      .reduce((acc: string[], cat) => acc.concat(PACK_EXTRAS[cat] || []), [])
      .filter((item, idx, arr) => arr.indexOf(item) === idx)
  );

  const { googleUrl, appleUrl } = buildMapsUrls();

  return (
    <div style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh' }}>

      {/* ── TOP NAV ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm" style={{ height: 64 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <button onClick={() => router.push('/')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/roady-logo.png" alt="Roady" style={{ height: 44, width: 'auto' }} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/my-trips')}
              className="text-sm font-semibold hidden sm:flex items-center gap-1.5 transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#D85A30')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
            >
              ← My Trips
            </button>
            {/* Share button */}
            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 px-1 py-1 bg-white shadow-sm">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                title="Share"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-50"
                style={{ color: copied ? '#D85A30' : '#6B7280' }}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── SUMMARY HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky z-30" style={{ top: 64 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-0">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: '#993C1D' }}>Your trip</p>
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                {start} → {end}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{trip.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#FDF6EE', color: '#993C1D' }}>
                📍 {trip.stops.length} stops
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#FDF6EE', color: '#993C1D' }}>
                🛣 {trip.totalMiles} mi
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#FDF6EE', color: '#993C1D' }}>
                ⏱ ~{formatDuration(trip.totalMiles)}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
            {(['overview', 'stops', 'stays', 'map', 'tips'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-3 px-3 font-semibold text-sm flex-shrink-0 transition-all border-b-2"
                style={{
                  borderColor: activeTab === tab ? '#D85A30' : 'transparent',
                  color: activeTab === tab ? '#D85A30' : '#6B7280',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'stops' && (
                  <>
                    Stops{' '}
                    <span
                      className="ml-1 inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#D85A30', color: 'white' }}
                    >
                      {trip.stops.length}
                    </span>
                  </>
                )}
                {tab === 'stays' && 'Stays'}
                {tab === 'map' && 'Map'}
                {tab === 'tips' && 'Tips & Packing'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: 'rgba(216,90,48,0.1)' }}>📍</div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Stops</p>
                </div>
                <p className="text-2xl font-extrabold" style={{ color: '#1B2D45' }}>{trip.stops.length}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {uniqueCategories.slice(0, 3).map((c) => CATEGORY_STYLES[c]?.label || c).join(' · ')}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: 'rgba(55,138,221,0.1)' }}>🚗</div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Drive</p>
                </div>
                <p className="font-extrabold" style={{ color: '#1B2D45', fontSize: '1.25rem' }}>
                  {formatDuration(trip.totalMiles)}{' '}
                  <span className="text-sm font-semibold text-gray-400">/ {trip.totalMiles}mi</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{trip.stops.length} stops along the way</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: 'rgba(29,158,117,0.1)' }}>🏨</div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Stay</p>
                </div>
                {trip.hotels && trip.hotels.length > 0 ? (
                  <>
                    <p className="text-sm font-extrabold leading-tight truncate" style={{ color: '#1B2D45' }}>
                      {trip.hotels[selectedHotelIdx ?? 0]?.name || trip.hotels[0].name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{trip.hotels.length} option{trip.hotels.length !== 1 ? 's' : ''} · {trip.hotels[0].priceRange}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold" style={{ color: '#1B2D45' }}>—</p>
                    <p className="text-xs text-gray-400 mt-1">No hotel selected</p>
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: 'rgba(239,159,39,0.1)' }}>🗺️</div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Route</p>
                </div>
                <p className="text-sm font-extrabold leading-snug truncate" style={{ color: '#1B2D45' }}>{start}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">→ {end}</p>
              </div>
            </div>

            {/* Map + What to expect */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 mb-6">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="relative" style={{ height: 320 }}>
                  {startCoords && endCoords ? (
                    <RouteMap
                      stops={trip.stops}
                      start={startCoords}
                      end={endCoords}
                      activeStop={activeStop}
                      onStopClick={setActiveStop}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
                      <p className="text-sm text-gray-400">Loading map…</p>
                    </div>
                  )}
                  <button
                    onClick={() => setActiveTab('map')}
                    className="absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md z-10 transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#1B2D45', backdropFilter: 'blur(4px)' }}
                  >
                    ⤢ Expand map
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#993C1D' }}>What to expect</p>
                <h3 className="text-lg font-bold mb-3" style={{ color: '#1B2D45' }}>{trip.routeName}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#4B5563' }}>{trip.tagline}</p>
                <div className="space-y-2.5">
                  {trip.stops.slice(0, 3).map((stop, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="flex-shrink-0 font-bold" style={{ color: '#D85A30' }}>▸</span>
                      <p style={{ color: '#374151' }}>
                        <strong>{stop.name}:</strong> {stop.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Horizontal stop strip */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg" style={{ color: '#1B2D45' }}>Your stops</h3>
                <button
                  onClick={() => setActiveTab('stops')}
                  className="text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: '#D85A30' }}
                >
                  View all →
                </button>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#D85A30 transparent' }}
              >
                {trip.stops.map((stop, i) => {
                  const catStyle = CATEGORY_STYLES[stop.category] || CATEGORY_STYLES.scenic;
                  return (
                    <button
                      key={i}
                      onClick={() => { setActiveTab('stops'); setActiveStop(i); }}
                      className="min-w-[190px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex-shrink-0 text-left transition-all hover:border-[#D85A30] hover:shadow-md"
                    >
                      <div
                        className="flex items-center justify-center text-3xl"
                        style={{ background: catStyle.gradient, height: 80 }}
                      >
                        {catStyle.emoji}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#D85A30' }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[10px] font-semibold uppercase" style={{ color: catStyle.color }}>
                            {catStyle.label}
                          </span>
                        </div>
                        <p className="font-bold text-sm leading-tight" style={{ color: '#1B2D45' }}>{stop.name}</p>
                        <p className="text-xs text-gray-400 mt-1">⏲ {stop.duration}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stay preview + Don't forget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                {trip.hotels && trip.hotels.length > 0 ? (() => {
                  const h = trip.hotels![overviewHotelIdx];
                  const priceLabel = h.fsqPrice != null ? '$'.repeat(h.fsqPrice) : h.priceRange;
                  return (
                    <>
                      <div className="relative" style={{ height: 180 }}>
                        {h.fsqPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.fsqPhoto} alt={h.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg,#8E7DBE,#5B4B8A)' }}>
                            🏨
                          </div>
                        )}
                        <div className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(253,246,238,0.95)', color: '#993C1D' }}>
                          YOUR STAY
                        </div>
                        {h.fsqRating != null && (
                          <div className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#1B2D45' }}>
                            ⭐ {h.fsqRating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="px-5 pt-4 pb-5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-extrabold text-base leading-tight" style={{ color: '#1B2D45' }}>{h.name}</h3>
                          <span className="font-bold text-sm flex-shrink-0" style={{ color: '#6B7280' }}>{priceLabel}</span>
                        </div>
                        <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{h.city || end}</p>
                        <a
                          href={`https://www.booking.com/searchresults.html?aid=2858827&ss=${encodeURIComponent(`${h.name} ${h.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: '#003580' }}
                        >
                          Book on Booking.com →
                        </a>
                        <button
                          onClick={() => handleSelectHotel(overviewHotelIdx)}
                          className="w-full mt-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                          style={
                            selectedHotelIdx === overviewHotelIdx
                              ? { backgroundColor: 'rgba(88,204,2,0.1)', color: '#46a302' }
                              : { backgroundColor: 'rgba(27,45,69,0.06)', color: '#1B2D45' }
                          }
                        >
                          {selectedHotelIdx === overviewHotelIdx ? '✓ Destination set' : 'Set as map destination'}
                        </button>
                        {trip.hotels!.length > 1 && (
                          <div className="flex items-center justify-between mt-3">
                            <button
                              onClick={() => setOverviewHotelIdx((i) => Math.max(0, i - 1))}
                              disabled={overviewHotelIdx === 0}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                              style={{ backgroundColor: 'rgba(27,45,69,0.07)' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <div className="flex items-center gap-1.5">
                              {trip.hotels!.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setOverviewHotelIdx(idx)}
                                  className="rounded-full transition-all"
                                  style={{
                                    width: idx === overviewHotelIdx ? 16 : 6,
                                    height: 6,
                                    backgroundColor: idx === overviewHotelIdx ? '#D85A30' : '#d1d5db',
                                  }}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => setOverviewHotelIdx((i) => Math.min(trip.hotels!.length - 1, i + 1))}
                              disabled={overviewHotelIdx === trip.hotels!.length - 1}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                              style={{ backgroundColor: 'rgba(27,45,69,0.07)' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="p-5">
                    <p className="text-sm text-gray-400">No hotel suggestions for this trip.</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#993C1D' }}>Don&apos;t forget</p>
                <ul className="space-y-2.5">
                  {CHECKLIST_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleCheck(item)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: checkedItems.has(item) ? '#D85A30' : '#d1d5db',
                          backgroundColor: checkedItems.has(item) ? '#D85A30' : 'transparent',
                        }}
                      >
                        {checkedItems.has(item) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span
                        className="text-sm"
                        style={{
                          color: checkedItems.has(item) ? '#9ca3af' : '#374151',
                          textDecoration: checkedItems.has(item) ? 'line-through' : 'none',
                        }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ════ STOPS ════ */}
        {activeTab === 'stops' && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-2xl font-extrabold" style={{ color: '#1B2D45' }}>All Stops</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStopFilter(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: stopFilter === null ? '#D85A30' : 'white',
                    color: stopFilter === null ? 'white' : '#6B7280',
                    border: stopFilter === null ? '1px solid transparent' : '1px solid #e5e7eb',
                  }}
                >
                  All
                </button>
                {(['nature', 'adventure', 'culture', 'food', 'scenic'] as const)
                  .filter((cat) => trip.stops.some((s) => s.category === cat))
                  .map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setStopFilter(stopFilter === cat ? null : cat)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: stopFilter === cat ? CATEGORY_STYLES[cat].color : 'white',
                        color: stopFilter === cat ? 'white' : '#6B7280',
                        border: stopFilter === cat ? '1px solid transparent' : '1px solid #e5e7eb',
                      }}
                    >
                      {CATEGORY_STYLES[cat].emoji} {CATEGORY_STYLES[cat].label}
                    </button>
                  ))}
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={trip.stops.map((_, i) => `stop-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#1D9E75' }} />
                  <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🚗 {start}</p>
                </div>

                {trip.stops
                  .filter((s) => !stopFilter || s.category === stopFilter)
                  .map((stop) => {
                    const realIdx = trip.stops.indexOf(stop);
                    const prevLat = realIdx === 0 ? (startCoords ? startCoords[1] : stop.lat) : trip.stops[realIdx - 1].lat;
                    const prevLng = realIdx === 0 ? (startCoords ? startCoords[0] : stop.lng) : trip.stops[realIdx - 1].lng;
                    return (
                      <div key={`stop-${realIdx}`}>
                        {!stopFilter && (
                          <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: 5 }}>
                            <div className="w-px h-3 flex-shrink-0" style={{ backgroundColor: '#e5e7eb' }} />
                            <span className="text-xs text-gray-400 ml-1">
                              🚗 {driveLabel(prevLat, prevLng, stop.lat, stop.lng)}
                            </span>
                          </div>
                        )}
                        <SortableStopCard
                          id={`stop-${realIdx}`}
                          stop={stop}
                          number={realIdx + 1}
                          isActive={activeStop === realIdx}
                          onClick={() => setActiveStop(realIdx)}
                          onDelete={() => handleDeleteStop(realIdx)}
                          onSuggestNew={() => handleSuggestStop(realIdx)}
                          onSuggestByCategory={(cat) => handleSuggestStop(realIdx, cat)}
                          isSuggesting={suggestingIdx === realIdx}
                        />
                      </div>
                    );
                  })}

                {!stopFilter && (
                  <>
                    {trip.stops.length > 0 && endCoords && (
                      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: 5 }}>
                        <div className="w-px h-3 flex-shrink-0" style={{ backgroundColor: '#e5e7eb' }} />
                        <span className="text-xs text-gray-400 ml-1">
                          🚗 {driveLabel(
                            trip.stops[trip.stops.length - 1].lat,
                            trip.stops[trip.stops.length - 1].lng,
                            endCoords[1],
                            endCoords[0]
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#1B2D45' }} />
                      <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🏁 {end}</p>
                    </div>
                  </>
                )}
              </SortableContext>
            </DndContext>

            {/* Add stop */}
            <div className="mt-4">
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
            </div>
          </div>
        )}

        {/* ════ STAYS ════ */}
        {activeTab === 'stays' && (
          <div>
            <h2 className="text-2xl font-extrabold mb-5" style={{ color: '#1B2D45' }}>Where to Stay</h2>
            {trip.hotels && trip.hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trip.hotels.map((hotel, idx) => (
                  <HotelCard
                    key={idx}
                    hotel={hotel}
                    stopCity={end}
                    isSelected={selectedHotelIdx === idx}
                    onSelect={() => handleSelectHotel(idx)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🏨</p>
                <p className="font-bold text-lg mb-2" style={{ color: '#1B2D45' }}>No hotel suggestions</p>
                <p className="text-gray-400 text-sm">Generate a new trip with hotel preferences to see options here.</p>
              </div>
            )}
            {selectedHotelIdx !== null && trip.hotels && (
              <p className="text-sm text-center mt-4 font-semibold" style={{ color: '#46a302' }}>
                ✓ Map destination updated to {trip.hotels[selectedHotelIdx].name}
              </p>
            )}
          </div>
        )}

        {/* ════ MAP ════ */}
        {activeTab === 'map' && (
          <div>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 580 }}>
              {startCoords && endCoords ? (
                <RouteMap
                  stops={trip.stops}
                  start={startCoords}
                  end={endCoords}
                  activeStop={activeStop}
                  onStopClick={setActiveStop}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
                  <p className="text-sm text-gray-400">Loading map…</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center mt-5">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#58CC02' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                Open in Google Maps
              </a>
              <a
                href={appleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border-2 transition-all hover:opacity-90"
                style={{ color: '#1B2D45', borderColor: '#1B2D45' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                Open in Apple Maps
              </a>
            </div>
          </div>
        )}

        {/* ════ TIPS & PACKING ════ */}
        {activeTab === 'tips' && (
          <div>
            <h2 className="text-2xl font-extrabold mb-5" style={{ color: '#1B2D45' }}>Tips & Packing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#993C1D' }}>🎒 Pack list</p>
                <ul className="space-y-3">
                  {packList.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleCheck(item)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: checkedItems.has(item) ? '#D85A30' : '#d1d5db',
                          backgroundColor: checkedItems.has(item) ? '#D85A30' : 'transparent',
                        }}
                      >
                        {checkedItems.has(item) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span
                        className="text-sm"
                        style={{
                          color: checkedItems.has(item) ? '#9ca3af' : '#374151',
                          textDecoration: checkedItems.has(item) ? 'line-through' : 'none',
                        }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#993C1D' }}>🚗 Driver&apos;s notes</p>
                <div className="space-y-3">
                  {trip.stops.map((stop, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                      <strong>{stop.name}.</strong> {stop.tip}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Floating map button */}
      {activeTab !== 'map' && (
        <button
          onClick={() => setActiveTab('map')}
          className="fixed right-6 bottom-6 z-30 font-semibold px-5 py-3 rounded-full text-white text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: '#D85A30', boxShadow: '0 8px 24px rgba(216,90,48,0.4)' }}
        >
          🗺 Full map
        </button>
      )}

    </div>
  );
}
