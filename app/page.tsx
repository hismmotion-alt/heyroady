'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/* ── Parallax hook ─────────────────────────────────────── */
function useParallax() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return scrollY;
}

/* ── Fade-in on scroll hook ────────────────────────────── */
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Route = {
  emoji: string;
  name: string;
  to: string;
  distance?: string;
  desc: string;
  badges: { label: string; bg: string; color: string }[];
};

const DEFAULT_ROUTES: Route[] = [
  { emoji: '🌊', name: 'Pacific Coast Highway', to: 'San Francisco', desc: 'Cliffside ocean views, sea lions, and old-growth redwoods along the most scenic drive in America.', badges: [{ label: 'Scenic Drive', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Coastal', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }] },
  { emoji: '🏔️', name: 'Yosemite Escape', to: 'Yosemite', desc: 'Granite peaks, valley meadows, and waterfalls that make every curve worth it.', badges: [{ label: 'Nature', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }, { label: 'Hiking', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }] },
  { emoji: '🍷', name: 'Wine Country Loop', to: 'Sonoma', desc: 'Rolling vineyards, farm-to-table lunches, and world-class wine at every stop.', badges: [{ label: 'Food & Wine', bg: 'rgba(216,90,48,0.1)', color: '#c2540a' }, { label: 'Relaxed', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }] },
  { emoji: '🌵', name: 'Desert & Stars', to: 'Joshua Tree', desc: 'Otherworldly rock formations, wildflower blooms, and the clearest night skies in Southern California.', badges: [{ label: 'Desert', bg: 'rgba(234,179,8,0.12)', color: '#a16207' }, { label: 'Adventure', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }] },
  { emoji: '🌲', name: 'Big Sur Coastal', to: 'San Luis Obispo', desc: 'Rugged cliffs meet crashing surf — McWay Falls, Bixby Bridge, and elephant seals along the way.', badges: [{ label: 'Coastal', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Scenic Drive', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }] },
  { emoji: '❄️', name: 'Sierra High Road', to: 'Mammoth Lakes', desc: 'Alpine lakes, volcanic hot springs, and mountain towns tucked between dramatic peaks.', badges: [{ label: 'Mountain', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Adventure', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }] },
];

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

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex items-center justify-between px-6 py-5 gap-4">
        <span className="font-bold text-base" style={{ color: '#1B2D45' }}>{question}</span>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
          style={{ color: '#58CC02', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      {open && (
        <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [flowType, setFlowType] = useState<'plan' | 'suggest'>(() =>
    searchParams.get('end') ? 'plan' : 'suggest'
  );
  const [start, setStart] = useState('');
  const [end, setEnd] = useState(() => searchParams.get('end') || '');
  const [suggestStart, setSuggestStart] = useState('');
  const [mapAnimation, setMapAnimation] = useState<any>(null);
  const [stepAnimations, setStepAnimations] = useState<any[]>([null, null, null]);
  const [howAnimations, setHowAnimations] = useState<any[]>([null, null, null, null]);
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesLocation, setRoutesLocation] = useState('');
  const [recentStarts, setRecentStarts] = useState<string[]>([]);

  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [suggestSuggestions, setSuggestSuggestions] = useState<string[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const tripsFade = useFadeIn(0.1);
  const howFade = useFadeIn(0.15);
  const footerFade = useFadeIn(0.3);

  const debounce = useCallback((fn: (q: string) => void, delay: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (q: string) => { clearTimeout(timer); timer = setTimeout(() => fn(q), delay); };
  }, []);

  const fetchStart = useCallback(debounce(async (q: string) => {
    const results = await fetchAddressSuggestions(q);
    setStartSuggestions(results);
    setStartOpen(results.length > 0);
  }, 300), [debounce]);

  const fetchEnd = useCallback(debounce(async (q: string) => {
    const results = await fetchAddressSuggestions(q);
    setEndSuggestions(results);
    setEndOpen(results.length > 0);
  }, 300), [debounce]);

  const fetchSuggest = useCallback(debounce(async (q: string) => {
    const results = await fetchAddressSuggestions(q);
    setSuggestSuggestions(results);
    setSuggestOpen(results.length > 0);
  }, 300), [debounce]);

  const doFetchRoutes = useCallback(async (location: string) => {
    if (location.length < 5) { setRoutes(DEFAULT_ROUTES); setRoutesLocation(''); return; }
    setRoutesLoading(true);
    try {
      const res = await fetch('/api/routes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: location }) });
      const data = await res.json();
      if (data.routes) { setRoutes(data.routes); setRoutesLocation(location); }
    } catch { /* keep defaults */ }
    finally { setRoutesLoading(false); }
  }, []);

  const fetchRoutes = useCallback(debounce((location: string) => doFetchRoutes(location), 1000), [debounce, doFetchRoutes]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) setStartOpen(false);
      if (endRef.current && !endRef.current.contains(e.target as Node)) setEndOpen(false);
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tripImageHeight = 230;
  const tripGap = 19;
  const tripSectionPadTop = 117;
  const tripSectionPadBottom = 130;
  const mapSize = 600;
  const mapOffsetY = -10;
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('roady_recent_starts');
      if (saved) setRecentStarts(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch('/map-search.json')
      .then((res) => res.json())
      .then((data) => setMapAnimation(data))
      .catch(() => {});

    const stepFiles = ['/new-message.json', '/settings.json', '/location-pin.json'];
    Promise.all(stepFiles.map((f) => fetch(f).then((r) => r.json()).catch(() => null)))
      .then((data) => setStepAnimations(data));

    const howFiles = ['/first.json', '/second.json', '/third.json', '/forth.json'];
    Promise.all(howFiles.map((f) => fetch(f).then((r) => r.json()).catch(() => null)))
      .then((data) => setHowAnimations(data));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start.trim() || !end.trim()) return;
    const updated = [start.trim(), ...recentStarts.filter(r => r !== start.trim())].slice(0, 5);
    setRecentStarts(updated);
    try { localStorage.setItem('roady_recent_starts', JSON.stringify(updated)); } catch { /* ignore */ }
    router.push(`/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Navbar */}
      <Navbar
        logoHeight={80}
        logoOffsetY={10}
        logoHref="/"
        extraLinks={
          <a href="#how-it-works" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors">
            How It Works
          </a>
        }
      />

      {/* Hero */}
      <section id="hero" className="relative pt-28 pb-16 sm:pt-36 sm:pb-24" style={{ overflow: 'visible' }}>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-left max-w-xl">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                <span>☀ local friend · California only</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight" style={{ color: '#1B2D45' }}>
                Every great road trip
                <br />
                needs <span style={{ color: '#58CC02' }}>a local friend.</span>
              </h1>

              <p className="text-lg sm:text-xl leading-relaxed mb-10" style={{ color: '#6B7280' }}>
                Roady uses AI to plan California road trips the way a local would — with hidden gems, insider tips, and stops you won&apos;t find in any guidebook.
              </p>

              {/* Flow toggle buttons */}
              <div className="flex gap-2 mb-8 p-1 rounded-xl" style={{ backgroundColor: '#F3F4F2', display: 'inline-flex' }}>
                <button
                  type="button"
                  onClick={() => setFlowType('plan')}
                  className="flex flex-col items-start px-5 py-2.5 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: flowType === 'plan' ? '#ffffff' : 'transparent',
                    color: flowType === 'plan' ? '#1B2D45' : '#6B7280',
                    boxShadow: flowType === 'plan' ? '0 2px 6px rgba(27,45,69,0.08)' : 'none',
                    minWidth: 140,
                  }}
                >
                  <span className="font-bold text-sm">Plan a Trip</span>
                  <span className="text-xs font-normal mt-0.5" style={{ color: '#9CA3AF' }}>I know where I&apos;m going</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlowType('suggest')}
                  className="flex flex-col items-start px-5 py-2.5 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: flowType === 'suggest' ? '#ffffff' : 'transparent',
                    color: flowType === 'suggest' ? '#1B2D45' : '#6B7280',
                    boxShadow: flowType === 'suggest' ? '0 2px 6px rgba(27,45,69,0.08)' : 'none',
                    minWidth: 140,
                  }}
                >
                  <span className="font-bold text-sm">Get Suggestions</span>
                  <span className="text-xs font-normal mt-0.5" style={{ color: '#9CA3AF' }}>Roady, surprise me</span>
                </button>
              </div>

              {/* Plan a Trip flow */}
              {flowType === 'plan' && (
                <>
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 relative" ref={startRef}>
                      <input
                        type="text"
                        placeholder="Starting from..."
                        value={start}
                        onChange={(e) => { setStart(e.target.value); fetchStart(e.target.value); fetchRoutes(e.target.value); }}
                        onFocus={() => { if (startSuggestions.length > 0) setStartOpen(true); }}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02]"
                        required
                        autoComplete="off"
                        autoFocus={!!searchParams.get('end')}
                      />
                      {startOpen && startSuggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {startSuggestions.map((s) => (
                            <li
                              key={s}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#46a302] cursor-pointer transition-colors"
                              onMouseDown={() => { setStart(s); setStartOpen(false); doFetchRoutes(s); }}
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex-1 relative" ref={endRef}>
                      <input
                        type="text"
                        placeholder="Heading to..."
                        value={end}
                        onChange={(e) => { setEnd(e.target.value); fetchEnd(e.target.value); }}
                        onFocus={() => { if (endSuggestions.length > 0) setEndOpen(true); }}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02]"
                        required
                        autoComplete="off"
                      />
                      {endOpen && endSuggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {endSuggestions.map((s) => (
                            <li
                              key={s}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#46a302] cursor-pointer transition-colors"
                              onMouseDown={() => { setEnd(s); setEndOpen(false); }}
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="group/btn relative px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden"
                      style={{
                        backgroundColor: '#58CC02',
                        color: '#ffffff',
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        btn.style.boxShadow = '0 14px 28px rgba(58,173,0,0.35), 0 6px 10px rgba(58,173,0,0.2), 0 0 20px rgba(239,159,39,0.25)';
                        btn.style.backgroundColor = '#3aad00';
                        btn.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(0deg) translateY(0px)';
                        btn.style.boxShadow = '';
                        btn.style.backgroundColor = '#58CC02';
                        btn.style.color = '#ffffff';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'perspective(600px) rotateX(2deg) translateY(1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(58,173,0,0.35), 0 2px 4px rgba(58,173,0,0.2)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 14px 28px rgba(58,173,0,0.35), 0 6px 10px rgba(58,173,0,0.2), 0 0 20px rgba(58,173,0,0.2)';
                      }}
                    >
                      <span className="absolute left-0 right-0 bottom-0 h-[5px] rounded-b-xl pointer-events-none transition-colors duration-300 bg-[#46a302] group-hover/btn:bg-[#3aad00]" />
                      <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(88,204,2,0.15), transparent)' }} />
                      <span className="relative z-10 flex items-center gap-2">
                        Plan My Trip
                        <svg className="w-5 h-5 transition-all duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </span>
                    </button>
                  </form>

                  <p className="text-sm text-gray-400">Free to use. No sign-up required.</p>
                  {recentStarts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-xs font-semibold text-gray-400 self-center">Recent:</span>
                      {recentStarts.map((addr) => (
                        <button
                          key={addr}
                          type="button"
                          onClick={() => { setStart(addr); doFetchRoutes(addr); }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:border-[#58CC02] hover:text-[#46a302]"
                          style={{ borderColor: '#E5E7EB', color: '#1B2D45', backgroundColor: '#ffffff' }}
                        >
                          {addr}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs font-semibold text-gray-400 self-center">Quick starts:</span>
                    {['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento'].map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => { setStart(city); doFetchRoutes(city); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:border-[#58CC02] hover:text-[#46a302]"
                        style={{ borderColor: '#E5E7EB', color: '#1B2D45', backgroundColor: '#ffffff' }}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Get Suggestions flow */}
              {flowType === 'suggest' && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!suggestStart.trim()) return;
                      router.push(`/suggest?start=${encodeURIComponent(suggestStart)}`);
                    }}
                    className="flex flex-col sm:flex-row gap-3 mb-4"
                  >
                    <div className="flex-1 relative" ref={suggestRef}>
                      <input
                        type="text"
                        placeholder="Your starting address or city..."
                        value={suggestStart}
                        onChange={(e) => { setSuggestStart(e.target.value); fetchSuggest(e.target.value); fetchRoutes(e.target.value); }}
                        onFocus={() => { if (suggestSuggestions.length > 0) setSuggestOpen(true); }}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02]"
                        required
                        autoComplete="off"
                      />
                      {suggestOpen && suggestSuggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {suggestSuggestions.map((s) => (
                            <li
                              key={s}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#46a302] cursor-pointer transition-colors"
                              onMouseDown={() => { setSuggestStart(s); setSuggestOpen(false); doFetchRoutes(s); }}
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="group/btn relative px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden"
                      style={{
                        backgroundColor: '#58CC02',
                        color: '#ffffff',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        btn.style.boxShadow = '0 14px 28px rgba(58,173,0,0.35)';
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
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Get Suggestions
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </span>
                    </button>
                  </form>
                  <p className="text-sm text-gray-400">Free to use. No sign-up required.</p>
                </>
              )}
            </div>

            {/* Right — Lottie animation */}
            {mapAnimation && (
              <div
                className="hidden lg:flex flex-shrink-0 items-center justify-center"
                style={{ width: 580, height: 580, marginRight: '-60px' }}
              >
                <Lottie animationData={mapAnimation} loop style={{ width: '100%', height: '100%' }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Routes Worth Driving */}
      <section className="py-20 px-6" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
                Routes Worth Driving
              </h2>
              <p className="text-gray-500 text-lg">
                {routesLocation
                  ? <>Personalized routes from <span className="font-semibold" style={{ color: '#1B2D45' }}>{routesLocation}</span></>
                  : "California's most loved road trips — ready to plan in seconds."}
              </p>
            </div>
            {routesLoading && (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#46a302' }}>
                <div className="w-4 h-4 border-2 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
                Finding routes…
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {routes.map((route) => (
              <div
                key={route.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl flex-shrink-0">{route.emoji}</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {route.distance && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(27,45,69,0.07)', color: '#1B2D45' }}>
                        {route.distance}
                      </span>
                    )}
                    {route.badges.map((b) => (
                      <span key={b.label} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: b.bg, color: b.color }}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-base mb-0.5" style={{ color: '#1B2D45' }}>{route.name}</h3>
                  <p className="text-xs text-gray-400 font-medium">📍 {route.to}</p>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed flex-1">{route.desc}</p>

                <button
                  onClick={() => {
                    setEnd(route.to);
                    setFlowType('plan');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
                >
                  Plan this route →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How does it work? */}
      <section id="how-it-works" className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
              How does it work?
            </h2>
            <p className="text-gray-500 text-lg">Like texting a friend who knows California inside out.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Tell Roady where you are',
                desc: 'Drop your city or address and Roady figures out what\'s within reach.',
              },
              {
                step: '02',
                title: 'Roady gets to know you',
                desc: 'A few quick questions — like asking a friend what kind of trip you\'re in the mood for.',
              },
              {
                step: '03',
                title: 'Get a local\'s picks',
                desc: 'Roady suggests destinations and stops the way a California local would — not the obvious tourist spots.',
              },
              {
                step: '04',
                title: 'Just drive',
                desc: 'Your full itinerary opens in Google Maps or Apple Maps. Nothing to print, nothing to plan.',
              },
            ].map((item, i) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                  {howAnimations[i]
                    ? <Lottie animationData={howAnimations[i]} loop style={{ width: 80, height: 80 }} />
                    : <div className="w-16 h-16 rounded-2xl" style={{ backgroundColor: 'rgba(88,204,2,0.1)' }} />
                  }
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#58CC02' }}>STEP {item.step}</p>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: '#1B2D45' }}>{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ */}
      <section className="py-20 px-6" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>Frequently asked questions</h2>
            <p className="text-gray-500 text-lg">Everything you need to know before hitting the road.</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Is Roady free to use?',
                a: 'Yes, completely free. No account, no credit card, no catch. Just enter your starting point and go.',
              },
              {
                q: 'How does Roady pick the stops?',
                a: 'Roady looks at your travel style, interests, and how far you\'re willing to drive — then suggests stops a California local would actually recommend, not just the obvious tourist spots.',
              },
              {
                q: 'Can I open the trip on my phone\'s maps app?',
                a: 'Yes. Once your trip is planned, you get a direct link to open the full route in Google Maps or Apple Maps with one tap — no copying, no pasting.',
              },
              {
                q: 'Does it work for trips outside California?',
                a: 'Right now Roady is built specifically for California road trips. We know the state well and wanted to do one thing really well before expanding.',
              },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Roady. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-gray-400 hover:text-[#46a302] transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-sm text-gray-400 hover:text-[#46a302] transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#58CC02' }} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
