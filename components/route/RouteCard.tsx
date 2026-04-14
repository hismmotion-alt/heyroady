// components/route/RouteCard.tsx
import type { RouteFrontmatter } from '@/lib/route-types';

interface RouteCardProps {
  route: RouteFrontmatter;
}

export default function RouteCard({ route }: RouteCardProps) {
  return (
    <a
      href={`/destinations/${route.slug}`}
      className="block rounded-2xl overflow-hidden relative group"
      style={{ height: '220px' }}
    >
      <img
        src={route.heroImage}
        alt={route.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {route.region}
        </p>
        <h3 className="text-lg font-extrabold text-white mb-1 leading-tight">{route.title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {route.miles} miles · {route.stopsCount} stops
          </p>
          <span className="text-xs font-bold" style={{ color: '#58CC02' }}>Read →</span>
        </div>
      </div>
    </a>
  );
}
