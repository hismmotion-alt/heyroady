'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start.trim() || !end.trim()) return;
    router.push(`/preferences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDF6EE', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(253,246,238,0.92)', borderColor: 'rgba(216,90,48,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-extrabold text-2xl tracking-tight" style={{ color: '#D85A30' }}>Roady</span>
          <a href="#how" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#D85A30] transition-colors">
            How It Works
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            <span>Your California road trip, reimagined</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] mb-6 tracking-tight" style={{ color: '#1B2D45' }}>
            Every great road trip
            <br />
            needs <span style={{ color: '#D85A30' }}>a local friend.</span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed mb-12 max-w-2xl mx-auto" style={{ color: '#6B7280' }}>
            Roady uses AI to plan California road trips the way a local would — with hidden gems, insider tips, and stops you won't find in any guidebook.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-4">
            <input
              type="text"
              placeholder="Starting from..."
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
              required
            />
            <input
              type="text"
              placeholder="Heading to..."
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#D85A30]"
              required
            />
            <button
              type="submit"
              className="px-8 py-4 rounded-xl text-white font-bold text-base transition-all duration-200 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: '#D85A30' }}
            >
              Plan My Trip
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>

          <p className="text-sm text-gray-400 mb-16">Free to use. No sign-up required.</p>

          {/* Route previews */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: 'Pacific Coast Highway', detail: '12 stops · 5 days', color: '#378ADD', bg: 'rgba(55,138,221,0.08)' },
              { label: 'Gold Country & Sierra', detail: '9 stops · 4 days', color: '#1D9E75', bg: 'rgba(29,158,117,0.08)' },
              { label: 'Wine Country Wanderer', detail: '8 stops · 3 days', color: '#D85A30', bg: 'rgba(216,90,48,0.08)' },
            ].map((route, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 text-left shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  if (i === 0) { setStart('San Francisco'); setEnd('San Diego'); }
                  if (i === 1) { setStart('Sacramento'); setEnd('Yosemite'); }
                  if (i === 2) { setStart('San Francisco'); setEnd('Mendocino'); }
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: route.bg, color: route.color }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: '#1B2D45' }}>{route.label}</p>
                <p className="text-xs text-gray-400">{route.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 px-6" style={{ backgroundColor: '#FAFAF5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#D85A30' }}>How It Works</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
              Three steps to the road trip<br />you&apos;ve always wanted
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Tell us your style', desc: "Share where you're starting, where you're heading, and what kind of traveler you are.", color: '#1D9E75' },
              { title: 'Roady plans your route', desc: 'Our AI crafts a personalized itinerary packed with local gems and insider tips.', color: '#D85A30' },
              { title: 'Hit the road', desc: 'Follow your route with an interactive map. Every stop comes with local tips.', color: '#378ADD' },
            ].map((step, i) => (
              <div key={i} className="relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${step.color}15`, color: step.color }}>
                  <span className="text-2xl font-extrabold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6" style={{ backgroundColor: '#1B2D45' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>Made with ☀️ in California</p>
          <p className="mt-4 sm:mt-0">© 2026 Roady. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
