// components/route/FeaturedStop.tsx

interface FeaturedStopProps {
  name: string;
  image: string;
  tip?: string;
  children: React.ReactNode;
}

export default function FeaturedStop({ name, image, tip, children }: FeaturedStopProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>{name}</h2>
      <img
        src={image}
        alt={name}
        className="w-full h-52 object-cover rounded-2xl mb-4"
      />
      <div className="text-gray-600 leading-relaxed mb-4">{children}</div>
      {tip && (
        <div
          className="flex gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: '#FDF6EE', borderLeft: '4px solid #58CC02' }}
        >
          <span className="text-base flex-shrink-0">💡</span>
          <p className="text-sm font-medium leading-snug" style={{ color: '#993C1D' }}>{tip}</p>
        </div>
      )}
    </div>
  );
}
