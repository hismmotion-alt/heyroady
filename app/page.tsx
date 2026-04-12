'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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

export default function HomePage() {
  const [flowType, setFlowType] = useState<'plan' | 'suggest'>('suggest');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [suggestStart, setSuggestStart] = useState('');
  const [mapAnimation, setMapAnimation] = useState<any>(null);
  const [stepAnimations, setStepAnimations] = useState<any[]>([null, null, null]);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglinePhase, setTaglinePhase] = useState<'typing' | 'hold' | 'erasing'>('typing');
  const taglineText = 'Your California road trip, reimagined';

  useEffect(() => {
    if (taglinePhase === 'typing') {
      if (taglineIndex < taglineText.length) {
        const delay = taglineIndex === 0 ? 400 : 30 + Math.random() * 40;
        const timer = setTimeout(() => setTaglineIndex((i) => i + 1), delay);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setTaglinePhase('erasing'), 5000);
        return () => clearTimeout(timer);
      }
    } else if (taglinePhase === 'erasing') {
      if (taglineIndex > 0) {
        const timer = setTimeout(() => setTaglineIndex((i) => i - 1), 15);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setTaglinePhase('typing'), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [taglineIndex, taglinePhase, taglineText.length]);

  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [suggestSuggestions, setSuggestSuggestions] = useState<string[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const scrollY = useParallax();
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) setStartOpen(false);
      if (endRef.current && !endRef.current.contains(e.target as Node)) setEndOpen(false);
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logoHeight = 80;
  const logoOffsetY = 10;
  const tripImageHeight = 230;
  const tripGap = 19;
  const tripSectionPadTop = 117;
  const tripSectionPadBottom = 130;
  const mapSize = 600;
  const mapOffsetY = -10;
  const router = useRouter();

  useEffect(() => {
    fetch('/map-search.json')
      .then((res) => res.json())
      .then((data) => setMapAnimation(data))
      .catch(() => {});

    const stepFiles = ['/new-message.json', '/settings.json', '/location-pin.json'];
    Promise.all(stepFiles.map((f) => fetch(f).then((r) => r.json()).catch(() => null)))
      .then((data) => setStepAnimations(data));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start.trim() || !end.trim()) return;
    router.push(`/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/roady-logo.png" alt="Roady" style={{ height: logoHeight, width: 'auto', transform: `translateY(${logoOffsetY}px)` }} />
          <a href="#how" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors">
            How It Works
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24" style={{ overflow: 'visible' }}>
        {/* Floating parallax shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute rounded-full opacity-[0.07]"
            style={{
              width: 400, height: 400, top: -80, left: -120,
              background: 'radial-gradient(circle, #58CC02, transparent 70%)',
              transform: `translateY(${scrollY * 0.12}px)`,
              transition: 'transform 0.1s linear',
            }}
          />
          <div
            className="absolute rounded-full opacity-[0.05]"
            style={{
              width: 300, height: 300, top: 200, right: -60,
              background: 'radial-gradient(circle, #46a302, transparent 70%)',
              transform: `translateY(${scrollY * 0.2}px)`,
              transition: 'transform 0.1s linear',
            }}
          />
          <div
            className="absolute rounded-full opacity-[0.04]"
            style={{
              width: 200, height: 200, bottom: -40, left: '40%',
              background: 'radial-gradient(circle, #378ADD, transparent 70%)',
              transform: `translateY(${scrollY * -0.08}px)`,
              transition: 'transform 0.1s linear',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div
              className="flex-1 text-left max-w-xl"
              style={{ transform: `translateY(${scrollY * 0.04}px)`, transition: 'transform 0.1s linear' }}
            >

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                <span style={{ position: 'relative', minHeight: 20, whiteSpace: 'nowrap' }}>
                  <span style={{ opacity: taglineIndex > 0 ? 0 : 1, transition: 'opacity 0.2s' }}>Your California road trip, reimagined</span>
                  {taglineIndex > 0 && (
                    <span style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                      <span>{taglineText.slice(0, taglineIndex)}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 2,
                          height: 16,
                          backgroundColor: '#46a302',
                          animation: 'cursorBlink 0.8s step-end infinite',
                        }}
                      />
                    </span>
                  )}
                </span>
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
              <div className="flex gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => setFlowType('suggest')}
                  className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                  style={{
                    backgroundColor: flowType === 'suggest' ? '#58CC02' : 'transparent',
                    color: flowType === 'suggest' ? '#ffffff' : '#1B2D45',
                    border: flowType === 'suggest' ? 'none' : '2px solid #58CC02',
                  }}
                >
                  Get Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setFlowType('plan')}
                  className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                  style={{
                    backgroundColor: flowType === 'plan' ? '#58CC02' : 'transparent',
                    color: flowType === 'plan' ? '#ffffff' : '#1B2D45',
                    border: flowType === 'plan' ? 'none' : '2px solid #58CC02',
                  }}
                >
                  Plan a Trip
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
                        onChange={(e) => { setStart(e.target.value); fetchStart(e.target.value); }}
                        onFocus={() => { if (startSuggestions.length > 0) setStartOpen(true); }}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02]"
                        required
                        autoComplete="off"
                      />
                      {startOpen && startSuggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {startSuggestions.map((s) => (
                            <li
                              key={s}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#46a302] cursor-pointer transition-colors"
                              onMouseDown={() => { setStart(s); setStartOpen(false); }}
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
                        animation: 'glowPulse 2.8s ease-in-out infinite',
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
                        onChange={(e) => { setSuggestStart(e.target.value); fetchSuggest(e.target.value); }}
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
                              onMouseDown={() => { setSuggestStart(s); setSuggestOpen(false); }}
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
                style={{ width: 580, height: 580, marginRight: '-60px', transform: `translateY(${scrollY * -0.03}px)`, transition: 'transform 0.1s linear' }}
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
          <div className="mb-12">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
              Routes Worth Driving
            </h2>
            <p className="text-gray-500 text-lg">
              California&apos;s most loved road trips — ready to plan in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                emoji: '🌊',
                name: 'Pacific Coast Highway',
                from: 'Los Angeles',
                to: 'San Francisco',
                badges: [{ label: 'Scenic Drive', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Coastal', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }],
                desc: 'Cliffside ocean views, sea lions, and old-growth redwoods along the most scenic drive in America.',
              },
              {
                emoji: '🏔️',
                name: 'Yosemite Escape',
                from: 'San Francisco',
                to: 'Yosemite',
                badges: [{ label: 'Nature', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }, { label: 'Hiking', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }],
                desc: 'Granite peaks, valley meadows, and waterfalls that make every curve worth it.',
              },
              {
                emoji: '🍷',
                name: 'Wine Country Loop',
                from: 'Napa',
                to: 'Sonoma',
                badges: [{ label: 'Food & Wine', bg: 'rgba(216,90,48,0.1)', color: '#c2540a' }, { label: 'Relaxed', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }],
                desc: 'Rolling vineyards, farm-to-table lunches, and world-class wine at every stop.',
              },
              {
                emoji: '🌵',
                name: 'Desert & Stars',
                from: 'Los Angeles',
                to: 'Joshua Tree',
                badges: [{ label: 'Desert', bg: 'rgba(234,179,8,0.12)', color: '#a16207' }, { label: 'Adventure', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }],
                desc: 'Otherworldly rock formations, wildflower blooms, and the clearest night skies in Southern California.',
              },
              {
                emoji: '🌲',
                name: 'Big Sur Coastal',
                from: 'Monterey',
                to: 'San Luis Obispo',
                badges: [{ label: 'Coastal', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Scenic Drive', bg: 'rgba(88,204,2,0.1)', color: '#46a302' }],
                desc: 'Rugged cliffs meet crashing surf — McWay Falls, Bixby Bridge, and elephant seals along the way.',
              },
              {
                emoji: '❄️',
                name: 'Sierra High Road',
                from: 'Lake Tahoe',
                to: 'Mammoth Lakes',
                badges: [{ label: 'Mountain', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' }, { label: 'Adventure', bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }],
                desc: 'Alpine lakes, volcanic hot springs, and mountain towns tucked between dramatic peaks.',
              },
            ].map((route) => (
              <div
                key={route.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{route.emoji}</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
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
                  onClick={() => router.push(`/preferences?start=${encodeURIComponent(route.from)}&end=${encodeURIComponent(route.to)}`)}
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
      <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
              How does it work?
            </h2>
            <p className="text-gray-500 text-lg">Plan your perfect California road trip in under a minute.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '📍',
                step: '01',
                title: 'Tell us where you\'re starting',
                desc: 'Enter your city or address — Roady works from anywhere in California.',
              },
              {
                icon: '🎯',
                step: '02',
                title: 'Share your travel style',
                desc: 'Solo, couple, or family? Nature lover or foodie? Answer 5 quick questions.',
              },
              {
                icon: '✨',
                step: '03',
                title: 'Get AI-powered suggestions',
                desc: 'Roady\'s AI picks the best destinations and stops matched to your vibe.',
              },
              {
                icon: '🗺️',
                step: '04',
                title: 'Hit the road',
                desc: 'Open your full trip in Google Maps or Apple Maps with one tap and go.',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: 'rgba(88,204,2,0.1)' }}
                >
                  {item.icon}
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
    </div>
  );
}
