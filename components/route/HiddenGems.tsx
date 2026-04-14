// components/route/HiddenGems.tsx
import type { RouteGem } from '@/lib/route-types';

interface HiddenGemsProps {
  gems: RouteGem[];
}

export default function HiddenGems({ gems }: HiddenGemsProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold mb-4" style={{ color: '#1B2D45' }}>Hidden Gems Along the Way</h2>
      <div className="flex flex-col gap-4">
        {gems.map((gem) => (
          <div key={gem.name} className="flex gap-4 items-start">
            <img
              src={gem.image}
              alt={gem.name}
              className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
            />
            <div>
              <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>{gem.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{gem.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
