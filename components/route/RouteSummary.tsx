// components/route/RouteSummary.tsx
import type { RouteStop } from '@/lib/route-types';

interface RouteSummaryProps {
  start: string;
  end: string;
  stops: RouteStop[];
}

export default function RouteSummary({ start, end, stops }: RouteSummaryProps) {
  const safeStops = stops ?? [];
  const allPoints = [start, ...safeStops.map((s) => s.name), end];
  const googleUrl =
    'https://www.google.com/maps/dir/' + allPoints.map(encodeURIComponent).join('/');
  const customizeUrl = `/customize?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&stops=${safeStops.map((s) => encodeURIComponent(s.name)).join('|')}`;

  return (
    <div className="mt-12">
      <div
        className="rounded-2xl px-6 py-4 mb-6"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <p className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
          Route Summary
        </p>
        <p className="text-sm text-gray-400">Full journey at a glance</p>
      </div>

      {/* Visual timeline */}
      <div className="mb-8 px-2">
        {/* Start */}
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-[#46a302]" style={{ backgroundColor: '#46a302' }} />
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🚗 {start}</p>
        </div>

        {/* Stops */}
        {safeStops.map((stop, i) => (
          <div key={stop.name} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-4 flex-shrink-0">
              <div className="w-px flex-1 my-0.5" style={{ backgroundColor: '#e5e7eb' }} />
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: '#D85A30', fontSize: '10px', minHeight: 20 }}
              >
                {i + 1}
              </div>
              <div className="w-px flex-1 my-0.5" style={{ backgroundColor: '#e5e7eb' }} />
            </div>
            <div className="flex items-center justify-between py-2.5 flex-1 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{stop.name}</p>
                <p className="text-xs text-gray-500">{stop.description}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0 ml-4">⏲ {stop.duration}</p>
            </div>
          </div>
        ))}

        {/* Connector to end */}
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center w-4 flex-shrink-0">
            <div className="w-px h-4" style={{ backgroundColor: '#e5e7eb' }} />
          </div>
        </div>

        {/* End */}
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-[#1B2D45]" style={{ backgroundColor: '#1B2D45' }} />
          <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>🏁 {end}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={customizeUrl}
          className="flex-1 py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90"
          style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
        >
          Customize this trip with Roady →
        </a>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 rounded-xl font-bold text-sm text-center border-2 transition-all hover:border-[#58CC02] hover:text-[#46a302]"
          style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
