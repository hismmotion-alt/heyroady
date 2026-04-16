'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import StopCard from '@/components/StopCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { TripData } from '@/lib/types';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
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

// Mapbox must be lazy-loaded (no SSR)
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
  const waypoints = searchParams.get('waypoints') || '';

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStop, setActiveStop] = useState(0);
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replacingStop, setReplacingStop] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !trip) return;
    const oldIndex = trip.stops.findIndex((_, i) => `stop-${i}` === active.id);
    const newIndex = trip.stops.findIndex((_, i) => `stop-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setTrip((prev) => prev ? { ...prev, stops: arrayMove(prev.stops, oldIndex, newIndex) } : prev);
    setActiveStop(newIndex);
  };

  // Hardcoded fallback coordinates for problematic California locations
  const LOCATION_OVERRIDES: Record<string, [number, number]> = {
    'Anaheim': [-117.9145, 33.8353],
    'Bakersfield': [-119.0187, 35.3733],
    'Berkeley': [-122.2727, 37.8715],
    'Beverly Hills': [-118.4065, 34.0901],
    'Big Sur': [-121.4247, 36.2704],
    'Carmel-by-the-Sea': [-121.9225, 36.5526],
    'Carmel': [-121.9225, 36.5526], // Alias for Carmel-by-the-Sea
    'Catalina Island': [-118.3220, 33.3850],
    'Coronado': [-117.1611, 32.6866],
    'Costa Mesa': [-117.9181, 33.6486],
    'Dana Point': [-117.7075, 33.4669],
    'Death Valley': [-116.8325, 36.5054],
    'El Centro': [-115.5625, 32.7942],
    'Eureka': [-124.1637, 40.8021],
    'Fresno': [-119.7674, 36.7378],
    'Half Moon Bay': [-122.4280, 37.4829],
    'Huntington Beach': [-117.9989, 33.7463],
    'Irvine': [-117.7261, 33.6846],
    'Joshua Tree': [-116.3087, 34.1356],
    'La Jolla': [-117.2710, 32.8455],
    'Laguna Beach': [-117.7831, 33.5427],
    'Lake Tahoe': [-120.0681, 39.0968],
    'Long Beach': [-118.1937, 33.7701],
    'Los Angeles': [-118.2437, 34.0522],
    'Malibu': [-118.6816, 34.0282],
    'Mammoth Lakes': [-118.9723, 37.6304],
    'Mendocino': [-123.7980, 39.2968],
    'Modesto': [-120.9965, 37.6688],
    'Monterey': [-121.8863, 36.6002],
    'Napa': [-122.2869, 38.2975],
    'Newport Beach': [-117.8274, 33.6189],
    'Oakland': [-122.2727, 37.8044],
    'Oceanside': [-117.3796, 33.1959],
    'Ojai': [-119.2419, 34.4348],
    'Ontario': [-117.6510, 34.0629],
    'Orange County': [-117.8265, 33.6189],
    'Oxnard': [-119.1773, 34.1975],
    'Pacific Grove': [-121.9188, 36.6274],
    'Palm Springs': [-116.5453, 33.8303],
    'Palo Alto': [-122.1430, 37.4419],
    'Pasadena': [-118.1445, 34.1478],
    'Paso Robles': [-120.6625, 35.6391],
    'Pismo Beach': [-120.6428, 35.1435],
    'Redding': [-122.5907, 40.5865],
    'Redondo Beach': [-118.3880, 33.8493],
    'Redwood City': [-122.2171, 37.4852],
    'Riverside': [-117.2961, 33.9425],
    'Sacramento': [-121.4944, 38.5816],
    'San Bernardino': [-117.2898, 34.1083],
    'San Clemente': [-117.6129, 33.4268],
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
    'Stockton': [-121.2723, 37.9577],
    'Temecula': [-117.1486, 33.7347],
    'Thousand Oaks': [-118.8353, 34.1899],
    'Ventura': [-119.2919, 34.2805],
    'Visalia': [-119.2805, 36.3305],
    'Yosemite': [-119.5783, 37.8715],
    'Yountville': [-122.3687, 38.2975],
  };

  // Geocode a place name to coordinates using Mapbox
  async function geocode(place: string): Promise<[number, number]> {
    // Check if we have a hardcoded override for this location
    if (LOCATION_OVERRIDES[place]) {
      return LOCATION_OVERRIDES[place];
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Add California context to improve results
    const searchQuery = place.includes(',') ? place : `${place}, California`;

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=us&proximity=-119.4179,36.7783&limit=1&access_token=${token}`
    );
    const data = await res.json();

    if (!data.features?.[0]) {
      // Fallback: try without California context
      const fallbackRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?country=us&limit=1&access_token=${token}`
      );
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.features?.[0]) throw new Error(`Could not find "${place}"`);
      return fallbackData.features[0].center as [number, number];
    }

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
            body: JSON.stringify({ start, end, travelGroup, stopTypes, numberOfStops, stopDuration, kidsAges, waypoints }),
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center max-w-md">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#58CC02' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!trip || !startCoords || !endCoords) return null;

  const CATEGORY_EMOJI: Record<string, string> = {
    nature: '🌿',
    food: '🍴',
    culture: '🏛️',
    adventure: '🏕️',
    scenic: '🌄',
  };

  const formatDuration = (miles: number) => {
    const hours = miles / 50;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const driveLabel = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const miles = haversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    return `~${formatDuration(miles)} drive`;
  };

  const buildMapsUrls = () => {
    const stops = trip!.stops;
    // Use "name, city" + coords as a label for Google, and lat,lng for Apple
    const googlePoints = [
      encodeURIComponent(start),
      ...stops.map((s) => `${s.lat},${s.lng}`),
      encodeURIComponent(end),
    ];
    const googleUrl = 'https://www.google.com/maps/dir/' + googlePoints.join('/');

    const appleDaddr = [
      ...stops.map((s) => `${s.lat},${s.lng}`),
      encodeURIComponent(end),
    ].join('+to:');
    const appleUrl = `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${appleDaddr}`;
    return { googleUrl, appleUrl };
  };

  const deleteStop = (i: number) => {
    setTrip((prev) => prev ? { ...prev, stops: prev.stops.filter((_, idx) => idx !== i) } : prev);
    if (activeStop >= i && activeStop > 0) setActiveStop(activeStop - 1);
  };

const suggestNewStop = async (i: number, preferredCategory?: string) => {
    if (!trip || replacingStop !== null) return;
    setReplacingStop(i);
    try {
      const res = await fetch('/api/suggest-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, currentStops: trip.stops, position: i, preferredCategory }),
      });
      if (!res.ok) throw new Error('Failed to get suggestion');
      const newStop = await res.json();
      setTrip((prev) => {
        if (!prev) return prev;
        const stops = [...prev.stops];
        stops[i] = newStop;
        return { ...prev, stops };
      });
      setActiveStop(i);
    } catch {
      // silent fail
    } finally {
      setReplacingStop(null);
    }
  };

  const handleSaveTrip = async () => {
    if (!trip || saving || savedTripId) return;
    if (!user) {
      const currentUrl = `/trip?${new URLSearchParams({
        start, end, travelGroup, stopTypes, numberOfStops, stopDuration,
        ...(kidsAges && { kidsAges }),
      }).toString()}`;
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/save-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, trip_data: trip }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      if (data.id) setSavedTripId(data.id);
    } catch {
      // silent fail — user can try again
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b bg-white flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.push('/')}>
          <img src="/roady-logo.png" alt="Roady" style={{ height: 56, width: 'auto' }} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{trip.routeName}</p>
          <p className="text-xs text-gray-400">{trip.tagline}</p>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <a href="/my-trips" className="text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors hidden sm:block">My Trips</a>
              {user.user_metadata?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border-2 border-gray-200" />
              )}
            </>
          ) : (
            <a href="/login" className="text-sm font-bold px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-[#58CC02] hover:text-[#46a302] transition-all" style={{ color: '#1B2D45' }}>
              Sign in
            </a>
          )}
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
        <div className="w-[400px] flex-shrink-0 overflow-y-auto bg-[#FAFAF8] border-l border-gray-100 p-4 pb-24">
          {/* Trip summary card */}
          <div
            className="rounded-2xl p-5 mb-5 border-l-4"
            style={{ backgroundColor: '#ffffff', borderColor: '#58CC02' }}
          >
            <h2 className="font-extrabold text-lg leading-tight mb-1" style={{ color: '#1B2D45' }}>
              {trip.routeName}
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{trip.tagline}</p>
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(88,204,2,0.1)', color: '#58CC02' }}
              >
                📍 {trip.stops.length} stops
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }}
              >
                🛣 {trip.totalMiles} mi
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(55,138,221,0.1)', color: '#378ADD' }}
              >
                ⏱ ~{formatDuration(trip.totalMiles)}
              </span>
            </div>

            {/* Route timeline */}
            <div className="flex flex-col">
              {/* Start */}
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-[#46a302] ring-offset-1" style={{ backgroundColor: '#46a302' }} />
                <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🚗 {start}</p>
              </div>

              {/* Stops */}
              {trip.stops.map((stop, i) => (
                <div key={i} className="flex items-stretch gap-3">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center w-4 flex-shrink-0">
                    <div className="w-px flex-1 my-0.5" style={{ backgroundColor: '#e5e7eb' }} />
                    <button
                      onClick={() => setActiveStop(i)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[10px] transition-transform hover:scale-110"
                      style={{ backgroundColor: activeStop === i ? '#D85A30' : '#f97316', minHeight: 20 }}
                    >
                      {i + 1}
                    </button>
                    <div className="w-px flex-1 my-0.5" style={{ backgroundColor: '#e5e7eb' }} />
                  </div>
                  {/* Stop name row */}
                  <button
                    onClick={() => setActiveStop(i)}
                    className="flex items-center gap-1.5 py-2 text-left hover:text-[#D85A30] transition-colors w-full"
                  >
                    <span className="text-sm">{CATEGORY_EMOJI[stop.category] || '📍'}</span>
                    <span className="text-sm font-semibold truncate" style={{ color: activeStop === i ? '#D85A30' : '#374151' }}>
                      {stop.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">⏲ {stop.duration}</span>
                  </button>
                </div>
              ))}

              {/* Connector to end */}
              <div className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-4 flex-shrink-0">
                  <div className="w-px flex-1" style={{ backgroundColor: '#e5e7eb' }} />
                </div>
              </div>

              {/* End */}
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1" style={{ backgroundColor: '#1B2D45' }} />
                <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🏁 {end}</p>
              </div>
            </div>
          </div>

          {/* Your Stops section header */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Your Stops</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(216,90,48,0.1)', color: '#D85A30' }}>
              {trip.stops.length}
            </span>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={trip.stops.map((_, i) => `stop-${i}`)} strategy={verticalListSortingStrategy}>
              {trip.stops.map((stop, i) => {
                const prevLat = i === 0 ? startCoords[1] : trip.stops[i - 1].lat;
                const prevLng = i === 0 ? startCoords[0] : trip.stops[i - 1].lng;
                return (
                  <div key={`stop-${i}`}>
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <div className="flex-1 h-px" style={{ backgroundColor: '#f3f4f6' }} />
                      <span className="text-xs font-medium text-gray-400 flex-shrink-0">
                        🚗 {driveLabel(prevLat, prevLng, stop.lat, stop.lng)}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: '#f3f4f6' }} />
                    </div>
                    <SortableStopCard
                      id={`stop-${i}`}
                      stop={stop}
                      number={i + 1}
                      isActive={activeStop === i}
                      onClick={() => setActiveStop(i)}
                      onDelete={() => deleteStop(i)}
                      onSuggestNew={() => suggestNewStop(i)}
                      onSuggestByCategory={(cat) => suggestNewStop(i, cat)}
                      isSuggesting={replacingStop === i}
                    />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>

          <div className="flex items-center gap-2 px-2 mt-1 mb-3">
            <div className="flex-1 h-px" style={{ backgroundColor: '#f3f4f6' }} />
            <span className="text-xs font-medium text-gray-400 flex-shrink-0">
              🚗 {driveLabel(trip.stops[trip.stops.length - 1].lat, trip.stops[trip.stops.length - 1].lng, endCoords[1], endCoords[0])}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#f3f4f6' }} />
          </div>

          <div className="flex items-center gap-3 mt-2 px-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1B2D45' }} />
            <p className="text-sm font-semibold text-gray-500">🏁 {end}</p>
          </div>

          {/* Open in Maps */}
          {(() => {
            const { googleUrl, appleUrl } = buildMapsUrls();
            return (
              <div className="mt-6 mx-1 space-y-3">
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
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
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: 'transparent', color: '#1B2D45', border: '2px solid #1B2D45' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  Open in Apple Maps
                </a>
              </div>
            );
          })()}

          {/* Roady footer tip */}
          <div className="mt-6 mx-1 px-4 py-3 rounded-xl" style={{ backgroundColor: '#f0fce4' }}>
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <p className="text-xs font-medium leading-relaxed" style={{ color: '#1a6e00' }}>
                Click any stop on the map or in this list to zoom in and learn more. Enjoy the drive!
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky save bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-t"
        style={{ backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)' }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>Like this trip?</p>
          <p className="text-xs text-gray-400">Save it to your Roady account</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-1.5"
            style={{ backgroundColor: copied ? '#f0fce4' : '#f3f4f6', color: copied ? '#46a302' : '#6b7280' }}
          >
            {copied ? '✓ Copied!' : '🔗 Share'}
          </button>
        <button
          onClick={handleSaveTrip}
          disabled={!!savedTripId || saving}
          className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2"
          style={{
            backgroundColor: savedTripId ? '#f0fce4' : '#58CC02',
            color: savedTripId ? '#46a302' : '#ffffff',
            cursor: savedTripId ? 'default' : 'pointer',
          }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : savedTripId ? (
            '✓ Trip saved'
          ) : (
            '💾 Save this trip'
          )}
        </button>
        </div>
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}><LoadingSpinner /></div>}>
      <TripContent />
    </Suspense>
  );
}
