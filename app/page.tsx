'use client';

import { useState, useEffect, useRef } from 'react';
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

const CA_CITIES = [
  'Anaheim', 'Bakersfield', 'Berkeley', 'Beverly Hills', 'Big Sur',
  'Carmel-by-the-Sea', 'Catalina Island', 'Coronado', 'Costa Mesa',
  'Dana Point', 'Death Valley', 'El Centro',
  'Eureka', 'Fresno', 'Half Moon Bay', 'Huntington Beach',
  'Irvine', 'Joshua Tree', 'La Jolla', 'Laguna Beach',
  'Lake Tahoe', 'Long Beach', 'Los Angeles', 'Malibu',
  'Mammoth Lakes', 'Mendocino', 'Modesto', 'Monterey',
  'Napa', 'Newport Beach', 'Oakland', 'Oceanside',
  'Ojai', 'Ontario', 'Orange County', 'Oxnard',
  'Pacific Grove', 'Palm Springs', 'Palo Alto', 'Pasadena',
  'Paso Robles', 'Pismo Beach', 'Redding', 'Redondo Beach',
  'Redwood City', 'Riverside', 'Sacramento', 'San Bernardino',
  'San Clemente', 'San Diego', 'San Francisco', 'San Jose',
  'San Luis Obispo', 'San Simeon', 'Santa Barbara', 'Santa Cruz',
  'Santa Monica', 'Santa Rosa', 'Sausalito', 'Sequoia National Park',
  'Solvang', 'Sonoma', 'South Lake Tahoe', 'Stockton',
  'Temecula', 'Thousand Oaks', 'Ventura', 'Visalia',
  'Yosemite', 'Yountville',
];

export default function HomePage() {
  const [flowType, setFlowType] = useState<'plan' | 'suggest'>('suggest');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [suggestStart, setSuggestStart] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [vibe, setVibe] = useState('');
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

  const [startFocused, setStartFocused] = useState(false);
  const [endFocused, setEndFocused] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollY = useParallax();
  const tripsFade = useFadeIn(0.1);
  const howFade = useFadeIn(0.15);
  const footerFade = useFadeIn(0.3);

  const getFilteredCities = (query: string) => {
    if (!query.trim()) return [];
    return CA_CITIES.filter((city) =>
      city.toLowerCase().startsWith(query.toLowerCase())
    ).slice(0, 5);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) setStartFocused(false);
      if (endRef.current && !endRef.current.contains(e.target as Node)) setEndFocused(false);
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

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestStart.trim() || !travelStyle || interests.length === 0 || !vibe) return;
    // TODO: Call API to get suggestions
    alert(`Getting suggestions for: ${suggestStart}, Style: ${travelStyle}, Interests: ${interests.join(', ')}, Vibe: ${vibe}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(253,246,238,0.92)', borderColor: 'rgba(216,90,48,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/roady-logo.png" alt="Roady" style={{ height: logoHeight, width: 'auto', transform: `translateY(${logoOffsetY}px)` }} />
          <a href="#how" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#D85A30] transition-colors">
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
              background: 'radial-gradient(circle, #D85A30, transparent 70%)',
              transform: `translateY(${scrollY * 0.12}px)`,
              transition: 'transform 0.1s linear',
            }}
          />
          <div
            className="absolute rounded-full opacity-[0.05]"
            style={{
              width: 300, height: 300, top: 200, right: -60,
              background: 'radial-gradient(circle, #1D9E75, transparent 70%)',
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}>
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
                          backgroundColor: '#1D9E75',
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
                needs <span style={{ color: '#D85A30' }}>a local friend.</span>
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
                    backgroundColor: flowType === 'suggest' ? '#D85A30' : 'transparent',
                    color: flowType === 'suggest' ? '#ffffff' : '#1B2D45',
                    border: flowType === 'suggest' ? 'none' : '2px solid #D85A30',
                  }}
                >
                  Get Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setFlowType('plan')}
                  className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                  style={{
                    backgroundColor: flowType === 'plan' ? '#D85A30' : 'transparent',
                    color: flowType === 'plan' ? '#ffffff' : '#1B2D45',
                    border: flowType === 'plan' ? 'none' : '2px solid #D85A30',
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
                        onChange={(e) => { setStart(e.target.value); setStartFocused(true); }}
                        onFocus={() => setStartFocused(true)}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
                        required
                        autoComplete="off"
                      />
                      {startFocused && getFilteredCities(start).length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {getFilteredCities(start).map((city) => (
                            <li
                              key={city}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-[#FDF6EE] hover:text-[#D85A30] cursor-pointer transition-colors"
                              onMouseDown={() => { setStart(city); setStartFocused(false); }}
                            >
                              {city}
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
                        onChange={(e) => { setEnd(e.target.value); setEndFocused(true); }}
                        onFocus={() => setEndFocused(true)}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
                        required
                        autoComplete="off"
                      />
                      {endFocused && getFilteredCities(end).length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {getFilteredCities(end).map((city) => (
                            <li
                              key={city}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-[#FDF6EE] hover:text-[#D85A30] cursor-pointer transition-colors"
                              onMouseDown={() => { setEnd(city); setEndFocused(false); }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="group/btn relative px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden"
                      style={{
                        backgroundColor: '#D85A30',
                        color: '#ffffff',
                        animation: 'glowPulse 2.8s ease-in-out infinite',
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        btn.style.boxShadow = '0 14px 28px rgba(27,45,69,0.4), 0 6px 10px rgba(27,45,69,0.2), 0 0 20px rgba(239,159,39,0.25)';
                        btn.style.backgroundColor = '#1B2D45';
                        btn.style.color = '#EF9F27';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(0deg) translateY(0px)';
                        btn.style.boxShadow = '';
                        btn.style.backgroundColor = '#D85A30';
                        btn.style.color = '#ffffff';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'perspective(600px) rotateX(2deg) translateY(1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(27,45,69,0.3), 0 2px 4px rgba(27,45,69,0.2)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 14px 28px rgba(27,45,69,0.35), 0 6px 10px rgba(27,45,69,0.2), 0 0 20px rgba(27,45,69,0.3)';
                      }}
                    >
                      <span className="absolute left-0 right-0 bottom-0 h-[5px] rounded-b-xl pointer-events-none transition-colors duration-300 bg-[#B04420] group-hover/btn:bg-[#0f1d30]" />
                      <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,90,48,0.15), transparent)' }} />
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
                  <form onSubmit={handleSuggestSubmit} className="space-y-6">
                    {/* Starting city */}
                    <div className="relative" ref={startRef}>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#1B2D45' }}>Where are you starting from?</label>
                      <input
                        type="text"
                        placeholder="Your city..."
                        value={suggestStart}
                        onChange={(e) => { setSuggestStart(e.target.value); setStartFocused(true); }}
                        onFocus={() => setStartFocused(true)}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
                        required
                        autoComplete="off"
                      />
                      {startFocused && getFilteredCities(suggestStart).length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                          {getFilteredCities(suggestStart).map((city) => (
                            <li
                              key={city}
                              className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-[#FDF6EE] hover:text-[#D85A30] cursor-pointer transition-colors"
                              onMouseDown={() => { setSuggestStart(city); setStartFocused(false); }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Travel style */}
                    <div>
                      <label className="block text-sm font-semibold mb-3" style={{ color: '#1B2D45' }}>How do you like to travel?</label>
                      <div className="flex flex-wrap gap-2">
                        {['Solo', 'Couple', 'Family', 'Friends'].map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setTravelStyle(style.toLowerCase())}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                            style={{
                              backgroundColor: travelStyle === style.toLowerCase() ? '#D85A30' : '#F5F5F5',
                              color: travelStyle === style.toLowerCase() ? '#ffffff' : '#1B2D45',
                              border: travelStyle === style.toLowerCase() ? 'none' : '1px solid #E5E5E5',
                            }}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interests */}
                    <div>
                      <label className="block text-sm font-semibold mb-3" style={{ color: '#1B2D45' }}>What are you interested in? (pick 2+)</label>
                      <div className="flex flex-wrap gap-2">
                        {['Nature', 'Food', 'Culture', 'Adventure', 'Beaches'].map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => {
                              const lower = interest.toLowerCase();
                              setInterests(interests.includes(lower)
                                ? interests.filter(i => i !== lower)
                                : [...interests, lower]
                              );
                            }}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                            style={{
                              backgroundColor: interests.includes(interest.toLowerCase()) ? '#D85A30' : '#F5F5F5',
                              color: interests.includes(interest.toLowerCase()) ? '#ffffff' : '#1B2D45',
                              border: interests.includes(interest.toLowerCase()) ? 'none' : '1px solid #E5E5E5',
                            }}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vibe */}
                    <div>
                      <label className="block text-sm font-semibold mb-3" style={{ color: '#1B2D45' }}>What&apos;s your trip vibe?</label>
                      <div className="flex flex-wrap gap-2">
                        {['Relaxed', 'Mixed', 'Adventurous'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVibe(v.toLowerCase())}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                            style={{
                              backgroundColor: vibe === v.toLowerCase() ? '#D85A30' : '#F5F5F5',
                              color: vibe === v.toLowerCase() ? '#ffffff' : '#1B2D45',
                              border: vibe === v.toLowerCase() ? 'none' : '1px solid #E5E5E5',
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={!suggestStart.trim() || !travelStyle || interests.length === 0 || !vibe}
                      className="w-full group/btn relative px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: '#D85A30',
                        color: '#ffffff',
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(-6deg) translateY(-3px)';
                        btn.style.boxShadow = '0 14px 28px rgba(27,45,69,0.4), 0 6px 10px rgba(27,45,69,0.2), 0 0 20px rgba(239,159,39,0.25)';
                        btn.style.backgroundColor = '#1B2D45';
                        btn.style.color = '#EF9F27';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget;
                        btn.style.transform = 'perspective(600px) rotateX(0deg) translateY(0px)';
                        btn.style.boxShadow = '';
                        btn.style.backgroundColor = '#D85A30';
                        btn.style.color = '#ffffff';
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Get Suggestions
                        <svg className="w-5 h-5 transition-all duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </span>
                    </button>
                  </form>

                  <p className="text-sm text-gray-400 mt-4">Free to use. No sign-up required.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
