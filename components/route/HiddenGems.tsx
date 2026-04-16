// components/route/HiddenGems.tsx
import type { RouteGem } from '@/lib/route-types';

interface HiddenGemsProps {
  gems: RouteGem[];
}

export default function HiddenGems({ gems }: HiddenGemsProps) {
  if (!gems || gems.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold mb-1" style={{ color: '#1B2D45' }}>💎 Hidden Gems Along the Way</h2>
      <p className="text-sm text-gray-400 mb-5">Spots most visitors skip — don&apos;t be one of them.</p>
      <div className="flex flex-col gap-4">
        {gems.map((gem) => (
          <div
            key={gem.name}
            className="flex gap-4 items-start rounded-2xl p-4 border border-gray-100"
            style={{ backgroundColor: '#fafafa' }}
          >
            <img
              src={gem.image}
              alt={gem.name}
              className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1" style={{ color: '#1B2D45' }}>✨ {gem.name}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{gem.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
