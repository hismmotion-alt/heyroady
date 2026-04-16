'use client';

import { useState, useEffect } from 'react';
import type { Stop } from '@/lib/types';

const CATEGORIES: { key: string; label: string; emoji: string; bg: string; text: string }[] = [
  { key: 'nature',    label: 'Nature',    emoji: '🌿', bg: 'bg-green-50',  text: 'text-[#1D9E75]' },
  { key: 'food',      label: 'Food',      emoji: '🍴', bg: 'bg-amber-50',  text: 'text-[#EF9F27]' },
  { key: 'culture',   label: 'Culture',   emoji: '🏛️', bg: 'bg-purple-50', text: 'text-purple-600' },
  { key: 'adventure', label: 'Adventure', emoji: '🏕️', bg: 'bg-red-50',    text: 'text-[#D85A30]' },
  { key: 'scenic',    label: 'Scenic',    emoji: '🌄', bg: 'bg-blue-50',   text: 'text-[#378ADD]' },
];

interface StopCardProps {
  stop: Stop;
  number: number;
  isActive: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onSuggestNew?: () => void;
  onSuggestByCategory?: (category: string) => void;
  isSuggesting?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export default function StopCard({
  stop, number, isActive,
  onClick, onDelete,
  onSuggestNew, onSuggestByCategory, isSuggesting,
  dragHandleProps, isDragging,
}: StopCardProps) {
  const cat = CATEGORIES.find((c) => c.key === stop.category) ?? CATEGORIES[4];
  const [open, setOpen] = useState(isActive);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div
      className={`rounded-2xl mb-3 transition-all duration-200 border-l-4 overflow-hidden
        ${isDragging ? 'shadow-2xl scale-[1.02] opacity-90 border-[#D85A30]' : isActive ? 'border-[#D85A30] bg-white shadow-lg scale-[1.01]' : 'border-transparent bg-white hover:border-[#D85A30]/50 hover:shadow-md'}`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2 cursor-pointer" onClick={onClick}>
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col gap-[3px] flex-shrink-0 px-0.5 py-1 cursor-grab active:cursor-grabbing touch-none"
          title="Hold to drag"
        >
          {[0,1,2].map((row) => (
            <div key={row} className="flex gap-[3px]">
              {[0,1].map((col) => (
                <div key={col} className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db' }} />
              ))}
            </div>
          ))}
        </div>

        <div className="w-7 h-7 rounded-full bg-[#D85A30] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{stop.name}</h3>
          <p className="text-xs text-gray-500">{stop.city}</p>
        </div>
        {/* Category badge — click to open picker */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowCategoryPicker((v) => !v); }}
          className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 transition-all ${cat.bg} ${cat.text}`}
          title="Change category"
        >
          {cat.emoji} {cat.label}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="ml-1 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-4 h-4 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Category picker */}
      {showCategoryPicker && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-xs text-gray-400 mb-2 font-medium">Suggest a stop in a different category:</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryPicker(false);
                  onSuggestByCategory?.(c.key);
                }}
                disabled={isSuggesting}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border-2
                  ${c.key === stop.category ? `${c.bg} ${c.text} border-current` : `bg-white ${c.text} border-transparent hover:border-current`}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible details */}
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{stop.description}</p>
          <div className="bg-[#FDF6EE] rounded-xl px-4 py-3 flex gap-2">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-sm text-[#993C1D] font-medium leading-snug">{stop.tip}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">⏲ {stop.duration}</p>
        </div>
      )}

      {!open && (
        <p className="text-xs text-gray-400 px-4 pb-1 text-right">⏲ {stop.duration}</p>
      )}

      {/* Action buttons */}
      {(onDelete || onSuggestNew) && (
        <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-t border-gray-50">
          {onSuggestNew && (
            <button
              onClick={(e) => { e.stopPropagation(); onSuggestNew(); }}
              disabled={isSuggesting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ backgroundColor: isSuggesting ? 'rgba(88,204,2,0.06)' : 'rgba(88,204,2,0.1)', color: '#46a302' }}
            >
              {isSuggesting ? (
                <>
                  <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: '#46a302', borderTopColor: 'transparent' }} />
                  Finding stop…
                </>
              ) : (
                <>✨ Suggest new</>
              )}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isSuggesting}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
            >
              🗑 Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
