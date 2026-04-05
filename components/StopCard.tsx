'use client';

import type { Stop } from '@/lib/types';

const categoryStyles: Record<string, { bg: string; text: string; label: string }> = {
  nature: { bg: 'bg-green-50', text: 'text-[#1D9E75]', label: 'Nature' },
  food: { bg: 'bg-amber-50', text: 'text-[#EF9F27]', label: 'Food' },
  culture: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Culture' },
  adventure: { bg: 'bg-red-50', text: 'text-[#D85A30]', label: 'Adventure' },
  scenic: { bg: 'bg-blue-50', text: 'text-[#378ADD]', label: 'Scenic' },
};

interface StopCardProps {
  stop: Stop;
  number: number;
  isActive: boolean;
  onClick: () => void;
}

export default function StopCard({ stop, number, isActive, onClick }: StopCardProps) {
  const cat = categoryStyles[stop.category] || categoryStyles.scenic;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 mb-3 cursor-pointer transition-all duration-200 border-2
        ${isActive ? 'border-[#D85A30] bg-white shadow-lg scale-[1.01]' : 'border-transparent bg-white hover:border-[#D85A30]/30 hover:shadow-md'}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#D85A30] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{stop.name}</h3>
          <p className="text-sm text-gray-500">{stop.city}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-3">{stop.description}</p>

      <div className="bg-[#FDF6EE] rounded-xl px-4 py-3 flex gap-2">
        <span className="text-base flex-shrink-0">💡</span>
        <p className="text-sm text-[#993C1D] font-medium leading-snug">{stop.tip}</p>
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">⏲ {stop.duration}</p>
    </div>
  );
}
