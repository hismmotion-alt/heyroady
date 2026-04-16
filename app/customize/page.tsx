'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

async function fetchAddressSuggestions(query: string): Promise<string[]> {
  if (!query.trim() || query.length < 2) return [];
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=us&types=address,place,neighborhood,locality,poi&limit=5`
    );
    const data = await res.json();
    return (data.features ?? []).map((f: { place_name: string }) => f.place_name);
  } catch {
    return [];
  }
}

function AutocompleteInput({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const results = await fetchAddressSuggestions(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 300);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        className={className ?? 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02] text-sm'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#46a302] cursor-pointer transition-colors"
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialStart = searchParams.get('start') || '';
  const initialEnd = searchParams.get('end') || '';
  const initialStops = (searchParams.get('stops') || '')
    .split('|')
    .map(decodeURIComponent)
    .filter(Boolean);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [stops, setStops] = useState<string[]>(initialStops.length > 0 ? initialStops : ['']);

  const addStop = () => setStops((prev) => [...prev, '']);
  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));
  const updateStop = (i: number, val: string) => setStops((prev) => prev.map((s, idx) => idx === i ? val : s));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start.trim() || !end.trim()) return;
    const filledStops = stops.filter((s) => s.trim());
    const waypoints = filledStops.join(',');
    const params = new URLSearchParams({
      start,
      end,
      travelGroup: 'solo',
      stopTypes: 'nature,food,scenic,adventure',
      numberOfStops: String(filledStops.length || 4),
      stopDuration: 'mix',
    });
    if (waypoints) params.set('waypoints', waypoints);
    router.push(`/trip?${params.toString()}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-24">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#1B2D45' }}>Customize Your Trip</h1>
        <p className="text-gray-500 mb-10">Edit your starting point, stops, and destination — then we'll build your itinerary.</p>

        <form onSubmit={handleSubmit}>
          {/* Timeline */}
          <div className="relative">
            {/* Start */}
            <div className="flex items-start gap-4 mb-0">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                <div className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-[#46a302] mt-3.5" style={{ backgroundColor: '#46a302' }} />
                <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#e5e7eb', minHeight: 28 }} />
              </div>
              <div className="flex-1 pb-3">
                <label className="block text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
                  Starting from
                </label>
                <AutocompleteInput
                  placeholder="e.g. Los Angeles, CA"
                  value={start}
                  onChange={setStart}
                />
              </div>
            </div>

            {/* Stops */}
            {stops.map((stop, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                  <div className="w-px" style={{ backgroundColor: '#e5e7eb', height: 12 }} />
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: '#D85A30', fontSize: '10px' }}
                  >
                    {i + 1}
                  </div>
                  <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#e5e7eb', minHeight: 28 }} />
                </div>
                <div className="flex-1 pb-3 flex items-center gap-2">
                  <AutocompleteInput
                    placeholder={`Stop ${i + 1} — e.g. Santa Barbara`}
                    value={stop}
                    onChange={(val) => updateStop(i, val)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02] text-sm"
                  />
                  {stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add stop */}
            <div className="flex items-start gap-4 mb-0">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                <div className="w-px" style={{ backgroundColor: '#e5e7eb', height: 12 }} />
                <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#e5e7eb', minHeight: 28 }} />
              </div>
              <div className="pb-3">
                <button
                  type="button"
                  onClick={addStop}
                  className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#58CC02' }}
                >
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold leading-none" style={{ borderColor: '#58CC02', color: '#58CC02' }}>+</span>
                  Add a stop
                </button>
              </div>
            </div>

            {/* End */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                <div className="w-px" style={{ backgroundColor: '#e5e7eb', height: 12 }} />
                <div className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-[#1B2D45] mt-0" style={{ backgroundColor: '#1B2D45' }} />
              </div>
              <div className="flex-1 pb-3">
                <label className="block text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
                  Heading to
                </label>
                <AutocompleteInput
                  placeholder="e.g. Big Sur, CA"
                  value={end}
                  onChange={setEnd}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="submit"
              disabled={!start.trim() || !end.trim()}
              className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
            >
              Build my trip →
            </button>
            <p className="text-xs text-gray-400 text-center">We'll build your itinerary around these stops.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#58CC02' }} />
      </div>
    }>
      <CustomizeContent />
    </Suspense>
  );
}
