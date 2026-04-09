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
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left content */}
            <div className="flex-1 text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ backgroundColor: 'rgba(29,158,117,0.1)', color: '#1D9E75' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                <span>Your California road trip, reimagined</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight" style={{ color: '#1B2D45' }}>
                Every great road trip
                <br />
                needs <span style={{ color: '#D85A30' }}>a local friend.</span>
              </h1>

              <p className="text-lg sm:text-xl leading-relaxed mb-10" style={{ color: '#6B7280' }}>
                Roady uses AI to plan California road trips the way a local would — with hidden gems, insider tips, and stops you won&apos;t find in any guidebook.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
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

              <p className="text-sm text-gray-400 mb-10">Free to use. No sign-up required.</p>

              {/* Route previews */}
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Pacific Coast Highway', detail: '12 stops · 5 days', color: '#378ADD', bg: 'rgba(55,138,221,0.08)' },
                  { label: 'Gold Country & Sierra', detail: '9 stops · 4 days', color: '#1D9E75', bg: 'rgba(29,158,117,0.08)' },
                  { label: 'Wine Country Wanderer', detail: '8 stops · 3 days', color: '#D85A30', bg: 'rgba(216,90,48,0.08)' },
                ].map((route, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 text-left shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      if (i === 0) { setStart('San Francisco'); setEnd('San Diego'); }
                      if (i === 1) { setStart('Sacramento'); setEnd('Yosemite'); }
                      if (i === 2) { setStart('San Francisco'); setEnd('Mendocino'); }
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: route.bg, color: route.color }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: '#1B2D45' }}>{route.label}</p>
                    <p className="text-xs text-gray-400">{route.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side — California map illustration */}
            <div className="flex-1 flex items-center justify-center w-full max-w-lg lg:max-w-none">
              <svg viewBox="0 0 480 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-[560px]">
                {/* California state shape — simplified flat silhouette */}
                <path
                  d="M200 32 C195 30, 170 38, 155 52 C140 66, 128 90, 120 110 C112 130, 108 148, 100 165 C92 182, 80 195, 72 215 C64 235, 62 248, 58 268 C54 288, 48 305, 48 325 C48 345, 55 358, 60 375 C65 392, 72 405, 85 425 C98 445, 110 455, 130 472 C150 489, 168 498, 190 510 C212 522, 228 526, 248 530 C268 534, 280 530, 295 520 C310 510, 318 498, 330 480 C342 462, 348 448, 355 428 C362 408, 365 392, 368 372 C371 352, 370 338, 372 318 C374 298, 378 282, 378 262 C378 242, 372 228, 368 210 C364 192, 358 178, 348 162 C338 146, 325 135, 310 120 C295 105, 282 95, 268 82 C254 69, 242 58, 228 48 C214 38, 205 34, 200 32Z"
                  fill="#E8DFD4"
                  stroke="#C8B9A8"
                  strokeWidth="1.5"
                />

                {/* Subtle topography lines */}
                <path d="M150 140 Q180 155, 200 145 Q220 135, 250 150" stroke="#D4C9BA" strokeWidth="0.8" fill="none" opacity="0.5" />
                <path d="M140 200 Q175 210, 210 195 Q245 180, 270 200" stroke="#D4C9BA" strokeWidth="0.8" fill="none" opacity="0.5" />
                <path d="M120 280 Q160 295, 200 275 Q240 255, 280 280" stroke="#D4C9BA" strokeWidth="0.8" fill="none" opacity="0.5" />

                {/* Mountain range — Sierra Nevada */}
                <g opacity="0.3">
                  <path d="M290 140 L300 115 L310 140" fill="#1D9E75" />
                  <path d="M305 140 L318 108 L331 140" fill="#1D9E75" />
                  <path d="M320 140 L330 120 L340 140" fill="#1D9E75" />
                </g>

                {/* Ocean waves on the left */}
                <path d="M38 250 Q28 245, 18 250 Q8 255, -2 250" stroke="#378ADD" strokeWidth="1.2" fill="none" opacity="0.3" />
                <path d="M42 270 Q32 265, 22 270 Q12 275, 2 270" stroke="#378ADD" strokeWidth="1.2" fill="none" opacity="0.25" />
                <path d="M35 290 Q25 285, 15 290 Q5 295, -5 290" stroke="#378ADD" strokeWidth="1.2" fill="none" opacity="0.2" />

                {/* Route line — PCH style, along the coast */}
                <path
                  d="M185 80 C175 110, 155 150, 140 190 C125 230, 105 270, 95 310 C85 350, 100 400, 130 450 C160 500, 200 520, 245 525"
                  stroke="#D85A30"
                  strokeWidth="3"
                  strokeDasharray="8 5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.9"
                >
                  <animate attributeName="stroke-dashoffset" from="52" to="0" dur="3s" repeatCount="indefinite" />
                </path>

                {/* Secondary route — inland */}
                <path
                  d="M185 80 C210 120, 250 160, 280 200 C310 240, 300 300, 270 360 C240 420, 210 470, 245 525"
                  stroke="#378ADD"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                >
                  <animate attributeName="stroke-dashoffset" from="40" to="0" dur="4s" repeatCount="indefinite" />
                </path>

                {/* City markers */}
                {/* San Francisco */}
                <g>
                  <circle cx="135" cy="185" r="14" fill="white" stroke="#D85A30" strokeWidth="2" />
                  <circle cx="135" cy="185" r="5" fill="#D85A30" />
                  <text x="95" y="175" fontSize="11" fontWeight="700" fill="#1B2D45" fontFamily="system-ui">SF</text>
                </g>

                {/* Monterey / Big Sur */}
                <g>
                  <circle cx="108" cy="268" r="10" fill="white" stroke="#1D9E75" strokeWidth="2" />
                  <circle cx="108" cy="268" r="4" fill="#1D9E75" />
                  <text x="118" y="272" fontSize="10" fontWeight="600" fill="#6B7280" fontFamily="system-ui">Big Sur</text>
                </g>

                {/* Yosemite */}
                <g>
                  <circle cx="280" cy="200" r="10" fill="white" stroke="#378ADD" strokeWidth="2" />
                  <circle cx="280" cy="200" r="4" fill="#378ADD" />
                  <text x="293" y="204" fontSize="10" fontWeight="600" fill="#6B7280" fontFamily="system-ui">Yosemite</text>
                </g>

                {/* Santa Barbara */}
                <g>
                  <circle cx="130" cy="440" r="10" fill="white" stroke="#EF9F27" strokeWidth="2" />
                  <circle cx="130" cy="440" r="4" fill="#EF9F27" />
                  <text x="142" y="444" fontSize="10" fontWeight="600" fill="#6B7280" fontFamily="system-ui">Santa Barbara</text>
                </g>

                {/* LA */}
                <g>
                  <circle cx="195" cy="485" r="12" fill="white" stroke="#D85A30" strokeWidth="2" />
                  <circle cx="195" cy="485" r="5" fill="#D85A30" />
                  <text x="210" y="489" fontSize="11" fontWeight="700" fill="#1B2D45" fontFamily="system-ui">LA</text>
                </g>

                {/* San Diego */}
                <g>
                  <circle cx="245" cy="525" r="14" fill="white" stroke="#D85A30" strokeWidth="2" />
                  <circle cx="245" cy="525" r="5" fill="#D85A30" />
                  <text x="262" y="529" fontSize="11" fontWeight="700" fill="#1B2D45" fontFamily="system-ui">San Diego</text>
                </g>

                {/* Sacramento */}
                <g>
                  <circle cx="195" cy="130" r="10" fill="white" stroke="#1D9E75" strokeWidth="2" />
                  <circle cx="195" cy="130" r="4" fill="#1D9E75" />
                  <text x="208" y="134" fontSize="10" fontWeight="600" fill="#6B7280" fontFamily="system-ui">Sacramento</text>
                </g>

                {/* Small decorative dots along coast */}
                <circle cx="120" cy="225" r="3" fill="#D85A30" opacity="0.3" />
                <circle cx="95" cy="340" r="3" fill="#D85A30" opacity="0.3" />
                <circle cx="112" cy="385" r="3" fill="#D85A30" opacity="0.3" />
                <circle cx="165" cy="465" r="3" fill="#D85A30" opacity="0.3" />

                {/* Compass rose */}
                <g transform="translate(400, 80)">
                  <circle cx="0" cy="0" r="22" fill="white" stroke="#C8B9A8" strokeWidth="1" />
                  <text x="0" y="-8" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1B2D45" fontFamily="system-ui">N</text>
                  <line x1="0" y1="-4" x2="0" y2="4" stroke="#D85A30" strokeWidth="1.5" />
                  <line x1="-4" y1="0" x2="4" y2="0" stroke="#C8B9A8" strokeWidth="1" />
                  <polygon points="0,-16 -3,-10 3,-10" fill="#D85A30" />
                  <polygon points="0,16 -3,10 3,10" fill="#C8B9A8" />
                </g>

                {/* Scale bar */}
                <g transform="translate(360, 560)">
                  <line x1="0" y1="0" x2="60" y2="0" stroke="#C8B9A8" strokeWidth="1.5" />
                  <line x1="0" y1="-4" x2="0" y2="4" stroke="#C8B9A8" strokeWidth="1.5" />
                  <line x1="60" y1="-4" x2="60" y2="4" stroke="#C8B9A8" strokeWidth="1.5" />
                  <text x="30" y="14" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">100 mi</text>
                </g>

                {/* Pulsing current-location indicator on SF */}
                <circle cx="135" cy="185" r="14" fill="none" stroke="#D85A30" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" from="14" to="24" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
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
