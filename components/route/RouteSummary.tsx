// components/route/RouteSummary.tsx
import type { RouteStop } from '@/lib/route-types';

interface RouteSummaryProps {
  start: string;
  end: string;
  stops: RouteStop[];
}

export default function RouteSummary({ start, end, stops }: RouteSummaryProps) {
  const allPoints = [start, ...stops.map((s) => s.name), end];
  const googleUrl =
    'https://www.google.com/maps/dir/' + allPoints.map(encodeURIComponent).join('/');

  return (
    <div className="mt-12">
      <div
        className="rounded-2xl px-6 py-4 mb-6"
        style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
      >
        <p className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
          Route Summary
        </p>
        <p className="text-sm text-gray-400">All stops at a glance</p>
      </div>

      <div className="flex flex-col gap-0 mb-8">
        {stops.map((stop, i) => (
          <div key={stop.name} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
              style={{ backgroundColor: '#D85A30' }}
            >
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{stop.name}</p>
              <p className="text-sm text-gray-500">{stop.description}</p>
            </div>
            <p className="text-xs text-gray-400 flex-shrink-0">{stop.duration}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <a
          href="/"
          className="flex-1 py-3 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90"
          style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
        >
          Plan this trip with Roady →
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
