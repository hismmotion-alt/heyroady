'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect } from 'react';
import type { TripData, Stop } from '@/lib/types';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
});

interface TripPanelProps {
  tripData: TripData;
  start: string;
  end: string;
  startCoords: [number, number];
  endCoords: [number, number];
  isSaved?: boolean;
  onSave?: () => void;
  onSignIn?: () => void;
}

export default function TripPanel({ tripData, start, end, startCoords, endCoords, isSaved, onSave, onSignIn }: TripPanelProps) {
  const [localStops, setLocalStops] = useState<Stop[]>([...tripData.stops]);

  // Sync stops when parent updates tripData (e.g. after AI modification)
  const prevStopsRef = useRef(tripData.stops);
  useEffect(() => {
    if (tripData.stops !== prevStopsRef.current) {
      prevStopsRef.current = tripData.stops;
      setLocalStops([...tripData.stops]);
      setEditingIndex(null);
      setActiveStop(-1);
    }
  }, [tripData.stops]);
  const [activeStop, setActiveStop] = useState(-1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [addingStop, setAddingStop] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopCity, setNewStopCity] = useState('');
  const [newStopDuration, setNewStopDuration] = useState('1–2 hours');
  const [showMapsMenu, setShowMapsMenu] = useState(false);
  const [showSignInPopover, setShowSignInPopover] = useState(false);
  const mapsMenuRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mapsMenuRef.current && !mapsMenuRef.current.contains(e.target as Node)) {
        setShowMapsMenu(false);
      }
      if (heartRef.current && !heartRef.current.contains(e.target as Node)) {
        setShowSignInPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatDuration = (miles: number) => {
    const h = Math.floor(miles / 50);
    const m = Math.round(((miles / 50) - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}`;
  const appleMapsUrl  = `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${encodeURIComponent(end)}`;

  function startEdit(i: number) {
    setEditingIndex(i);
    setEditName(localStops[i].name);
    setEditDuration(localStops[i].duration);
  }

  function saveEdit(i: number) {
    setLocalStops((prev) => prev.map((s, idx) =>
      idx === i ? { ...s, name: editName || s.name, duration: editDuration || s.duration } : s
    ));
    setEditingIndex(null);
  }

  function deleteStop(i: number) {
    setLocalStops((prev) => prev.filter((_, idx) => idx !== i));
    if (activeStop === i) setActiveStop(-1);
  }

  function confirmAddStop() {
    if (!newStopName.trim()) return;
    const newStop: Stop = {
      name: newStopName.trim(),
      city: newStopCity.trim() || end,
      description: '',
      tip: '',
      duration: newStopDuration.trim() || '1–2 hours',
      lat: endCoords[0],
      lng: endCoords[1],
      category: 'scenic',
      stopType: 'destination',
    };
    setLocalStops((prev) => [...prev, newStop]);
    setNewStopName('');
    setNewStopCity('');
    setNewStopDuration('1–2 hours');
    setAddingStop(false);
  }

  function toggleChecklist(i: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#993C1D' }}>Your trip</p>
          <p className="font-extrabold text-sm truncate" style={{ color: '#1B2D45' }}>
            {tripData.routeName}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs font-semibold" style={{ color: '#D85A30' }}>
              📍 {localStops.length} stops
            </span>
            <span className="text-xs font-semibold" style={{ color: '#378ADD' }}>
              🛣 {tripData.totalMiles} mi · ~{formatDuration(tripData.totalMiles)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Heart / save */}
          <div className="relative" ref={heartRef}>
            <button
              onClick={() => {
                if (onSave) { onSave(); }
                else { setShowSignInPopover((v) => !v); }
              }}
              disabled={isSaved}
              className="w-8 h-8 rounded-full flex items-center justify-center border transition-all"
              style={{
                borderColor: isSaved ? '#ef4444' : '#e5e7eb',
                color: isSaved ? '#ef4444' : '#9ca3af',
                backgroundColor: isSaved ? 'rgba(239,68,68,0.06)' : 'white',
              }}
              title={isSaved ? 'Saved' : 'Save trip'}
            >
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            {showSignInPopover && !onSave && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-52 z-20">
                <p className="text-xs font-semibold text-gray-700 mb-2">Sign in to save your trip</p>
                <button
                  onClick={() => { setShowSignInPopover(false); onSignIn?.(); }}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#D85A30' }}
                >
                  Sign In →
                </button>
              </div>
            )}
          </div>

          {/* Open in Maps dropdown */}
          <div className="relative" ref={mapsMenuRef}>
            <button
              onClick={() => setShowMapsMenu((v) => !v)}
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90 whitespace-nowrap flex items-center gap-1"
              style={{ backgroundColor: '#378ADD' }}
            >
              Open in Maps
              <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {showMapsMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 w-44">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMapsMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🗺️ Google Maps
                </a>
                <a
                  href={appleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMapsMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  🍎 Apple Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="flex-shrink-0 overflow-hidden" style={{ height: 140 }}>
          <RouteMap
            stops={localStops}
            start={startCoords}
            end={endCoords}
            activeStop={activeStop}
            onStopClick={setActiveStop}
          />
        </div>

        {/* Destination description */}
        {tripData.destinationDescription && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#378ADD' }}>About {end}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{tripData.destinationDescription}</p>
          </div>
        )}

        {/* Stop list */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Stops</p>
            <button
              onClick={() => setAddingStop(true)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:bg-[rgba(216,90,48,0.08)]"
              style={{ color: '#D85A30' }}
            >
              + Add stop
            </button>
          </div>

          <div className="space-y-1">
            {localStops.map((stop, i) => {
              const isEnRoute = stop.stopType === 'en-route';
              const accent = isEnRoute ? '#D85A30' : '#378ADD';
              const isActive = activeStop === i;
              const isEditing = editingIndex === i;

              return (
                <div
                  key={i}
                  className="rounded-lg transition-all"
                  style={{
                    backgroundColor: isActive ? (isEnRoute ? 'rgba(216,90,48,0.06)' : 'rgba(55,138,221,0.06)') : 'transparent',
                    borderLeft: `3px solid ${isActive ? accent : 'transparent'}`,
                  }}
                >
                  {isEditing ? (
                    <div className="px-2.5 py-2 space-y-1.5">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Stop name"
                        className="w-full text-xs font-semibold px-2 py-1 rounded border border-gray-200 outline-none focus:border-[#D85A30]"
                        style={{ color: '#1B2D45' }}
                      />
                      <input
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        placeholder="Duration (e.g. 1–2 hours)"
                        className="w-full text-xs px-2 py-1 rounded border border-gray-200 outline-none focus:border-[#D85A30] text-gray-500"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => saveEdit(i)}
                          className="text-[10px] font-bold px-3 py-1 rounded-full text-white"
                          style={{ backgroundColor: '#D85A30' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-[10px] font-semibold px-3 py-1 rounded-full border border-gray-200 text-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-1.5">
                      <button
                        onClick={() => setActiveStop(isActive ? -1 : i)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <div
                          className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: accent }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate" style={{ color: '#1B2D45' }}>{stop.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{stop.city} · {stop.duration}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(i)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteStop(i)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add stop form */}
          {addingStop && (
            <div className="mt-2 px-2 py-2 rounded-lg border border-dashed border-gray-200 space-y-1.5">
              <input
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="Stop name *"
                className="w-full text-xs font-semibold px-2 py-1 rounded border border-gray-200 outline-none focus:border-[#D85A30]"
                style={{ color: '#1B2D45' }}
                autoFocus
              />
              <input
                value={newStopCity}
                onChange={(e) => setNewStopCity(e.target.value)}
                placeholder={`City (default: ${end})`}
                className="w-full text-xs px-2 py-1 rounded border border-gray-200 outline-none focus:border-[#D85A30] text-gray-500"
              />
              <input
                value={newStopDuration}
                onChange={(e) => setNewStopDuration(e.target.value)}
                placeholder="Duration"
                className="w-full text-xs px-2 py-1 rounded border border-gray-200 outline-none focus:border-[#D85A30] text-gray-500"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={confirmAddStop}
                  disabled={!newStopName.trim()}
                  className="text-[10px] font-bold px-3 py-1 rounded-full text-white disabled:opacity-40"
                  style={{ backgroundColor: '#D85A30' }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingStop(false); setNewStopName(''); setNewStopCity(''); }}
                  className="text-[10px] font-semibold px-3 py-1 rounded-full border border-gray-200 text-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trip checklist */}
        {tripData.tripChecklist && tripData.tripChecklist.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Trip checklist</p>
            <div className="space-y-1.5">
              {tripData.tripChecklist.map((item, i) => {
                const checked = checkedItems.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleChecklist(i)}
                    className="w-full flex items-start gap-2.5 text-left group"
                  >
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                      style={{
                        borderColor: checked ? '#58CC02' : '#d1d5db',
                        backgroundColor: checked ? '#58CC02' : 'transparent',
                      }}
                    >
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p
                      className="text-xs leading-relaxed transition-colors"
                      style={{ color: checked ? '#9ca3af' : '#374151', textDecoration: checked ? 'line-through' : 'none' }}
                    >
                      {item}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
