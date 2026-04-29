'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { geocode } from '@/lib/geocode';
import { getHotelImageUrl } from '@/lib/hotel-images';
import type { HotelSuggestion, Stop, TripData } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import {
  PLANNER_ROUTE_DEFINITIONS,
  PLANNER_ROUTE_ORDER,
  POPULAR_STARTS,
  type PlannerRouteKey,
  type PlannerStop,
  type StartRegion,
} from '@/components/home/plannerData';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-[28px] bg-white/70 animate-pulse" />,
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const HAS_MAPBOX = Boolean(MAPBOX_TOKEN);
const PLANNER_STORAGE_KEY = 'roady_planner_state';

type PlannerStep =
  | 'start'
  | 'group'
  | 'kids'
  | 'distance'
  | 'interests'
  | 'hotelBudget'
  | 'hotelDetails'
  | 'enroute'
  | 'spots'
  | 'generating'
  | 'results'
  | 'save'
  | 'saved';

type PlannerPreferences = {
  travelGroup: string;
  kidsAges: string[];
  distancePreference: string;
  interests: string[];
  hotelPreference: string;
  hotelGuests: string;
  hotelCheckin: string;
  hotelNights: string;
  numberOfEnrouteStops: string;
  numberOfStops: string;
};

type SuggestedRouteOption = {
  id: string;
  name: string;
  tagline: string;
  via: string;
  destination: string;
  icon: string;
  fallbackRouteId?: PlannerRouteKey;
};

type PersistedPlannerState = {
  step: PlannerStep;
  seedRouteId: PlannerRouteKey;
  startInput: string;
  startCoords: [number, number] | null;
  prefs: PlannerPreferences;
  routeOptions: SuggestedRouteOption[];
  routeOptionIndex: number;
  tripData: TripData | null;
  stops: PlannerStop[];
  mapEndCoords: [number, number] | null;
  selectedHotelIndex: number;
  hotelCarouselIndex?: number;
  autoSaveOnRestore?: boolean;
};

type ChoiceCardItem = {
  id: string;
  label: string;
  desc: string;
  emoji: string;
};

const DEFAULT_PREFS: PlannerPreferences = {
  travelGroup: '',
  kidsAges: [],
  distancePreference: '',
  interests: [],
  hotelPreference: '',
  hotelGuests: '',
  hotelCheckin: '',
  hotelNights: '',
  numberOfEnrouteStops: '',
  numberOfStops: '',
};

const TRAVEL_GROUPS: ChoiceCardItem[] = [
  { id: 'solo', label: 'Solo', desc: 'Just me and the open road', emoji: '🎒' },
  { id: 'partner', label: 'With my partner', desc: 'A romantic getaway for two', emoji: '💑' },
  { id: 'family-adults', label: 'Family (adults only)', desc: 'Quality time with the family', emoji: '👨‍👩‍👦' },
  { id: 'family-kids', label: 'Family with kids', desc: 'Fun for all ages', emoji: '👶' },
  { id: 'friends', label: 'Friends', desc: 'A crew adventure', emoji: '🎉' },
];

const KIDS_AGES: ChoiceCardItem[] = [
  { id: 'baby-toddler', label: 'Baby & toddler', desc: '0-3 years old', emoji: '🍼' },
  { id: 'little-kids', label: 'Little kids', desc: '4-7 years old', emoji: '🧸' },
  { id: 'kids', label: 'Kids', desc: '8-12 years old', emoji: '🎮' },
  { id: 'teens', label: 'Teens', desc: '13-17 years old', emoji: '🎧' },
];

const INTEREST_GROUPS = [
  {
    category: 'OUTDOORS',
    items: [
      { id: 'beaches', label: 'Beaches', emoji: '🌊' },
      { id: 'hiking', label: 'Hiking', emoji: '🥾' },
      { id: 'camping', label: 'Camping', emoji: '⛺' },
      { id: 'wildlife', label: 'Wildlife', emoji: '🦅' },
      { id: 'sunsets', label: 'Sunsets', emoji: '🌅' },
      { id: 'surf', label: 'Surf', emoji: '🏄' },
    ],
  },
  {
    category: 'FOOD & DRINK',
    items: [
      { id: 'local-food', label: 'Local food', emoji: '🌯' },
      { id: 'wine', label: 'Wine', emoji: '🍷' },
      { id: 'coffee', label: 'Coffee', emoji: '☕' },
      { id: 'breweries', label: 'Breweries', emoji: '🍺' },
      { id: 'bakeries', label: 'Bakeries', emoji: '🥐' },
    ],
  },
  {
    category: 'CULTURE',
    items: [
      { id: 'history', label: 'History', emoji: '🏛' },
      { id: 'art', label: 'Art', emoji: '🎨' },
      { id: 'photography', label: 'Photography', emoji: '📷' },
      { id: 'boutique-shops', label: 'Boutique shops', emoji: '🛍' },
      { id: 'museums', label: 'Museums', emoji: '🖼' },
    ],
  },
  {
    category: 'ADVENTURE',
    items: [
      { id: 'adventure', label: 'Thrills', emoji: '⚡' },
      { id: 'scenic', label: 'Scenic drives', emoji: '🛣' },
      { id: 'national-parks', label: 'National Parks', emoji: '🌲' },
      { id: 'road-stops', label: 'Roadside gems', emoji: '💎' },
    ],
  },
];

const HOTEL_BUDGETS: ChoiceCardItem[] = [
  { id: '$', label: 'Budget', desc: 'Motels, hostels, affordable stays', emoji: '🏨' },
  { id: '$$', label: 'Mid-range', desc: 'Comfortable hotels', emoji: '🏩' },
  { id: '$$$', label: 'Luxury', desc: 'Upscale hotels and resorts', emoji: '🏰' },
  { id: 'none', label: 'No hotel', desc: "I'll sort accommodation separately", emoji: '🚗' },
];

const DISTANCE_OPTIONS: ChoiceCardItem[] = [
  { id: 'under-150', label: 'Under 150 miles', desc: 'Keep the destination close and easy.', emoji: '🚘' },
  { id: '150-plus', label: '150+ miles', desc: "I'm up for a longer drive.", emoji: '🛣️' },
  { id: 'surprise', label: 'Surprise me', desc: 'Let Roady choose the best distance.', emoji: '✨' },
];

const ENROUTE_COUNTS: ChoiceCardItem[] = [
  { id: '0', label: 'None', desc: 'Drive straight through', emoji: '⚡' },
  { id: '1', label: '1 stop', desc: 'One quick break', emoji: '1️⃣' },
  { id: '2', label: '2 stops', desc: 'A couple of breaks', emoji: '2️⃣' },
  { id: '3', label: '3 stops', desc: 'A few along the way', emoji: '3️⃣' },
];

const DESTINATION_SPOT_COUNTS: ChoiceCardItem[] = [
  { id: '1', label: '1 spot', desc: 'Quick and focused', emoji: '1️⃣' },
  { id: '2', label: '2 spots', desc: 'A couple of highlights', emoji: '2️⃣' },
  { id: '3', label: '3 spots', desc: 'A nice balance', emoji: '3️⃣' },
  { id: '4', label: '4 spots', desc: 'Plenty to explore', emoji: '4️⃣' },
  { id: '5', label: '5 spots', desc: 'The full experience', emoji: '5️⃣' },
  { id: 'auto', label: 'Choose for me', desc: 'Let Roady decide the best number', emoji: '✨' },
];

const HOTEL_GUEST_OPTIONS = ['1', '2', '3', '4', '5', '6+'];
const HOTEL_NIGHT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7+'];

const INTEREST_LABELS: Record<string, string> = Object.fromEntries(
  INTEREST_GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.label]))
);

const GROUP_LABELS: Record<string, string> = Object.fromEntries(
  TRAVEL_GROUPS.map((group) => [group.id, group.label])
);

const HOTEL_LABELS: Record<string, string> = Object.fromEntries(
  HOTEL_BUDGETS.map((hotel) => [hotel.id, hotel.label])
);

const DISTANCE_LABELS: Record<string, string> = Object.fromEntries(
  DISTANCE_OPTIONS.map((option) => [option.id, option.label])
);

const ROUTE_ICONS: Record<PlannerRouteKey, string> = {
  pch: '🌊',
  parks: '🌲',
  desert: '🌵',
  custom: '🛣️',
};

const PLANNER_META: Record<
  PlannerStep,
  { eyebrow: string; title: string; description: string }
> = {
  start: {
    eyebrow: 'Starting point',
    title: 'Where are you starting from?',
    description: 'Type an address, pick a popular start, or let Roady detect your current location.',
  },
  group: {
    eyebrow: 'Travel crew',
    title: "Who's coming along?",
    description: 'This helps Roady understand the shape of the trip before suggesting a route.',
  },
  kids: {
    eyebrow: 'Kids ages',
    title: 'How old are the kids?',
    description: 'Select all that apply so we find age-appropriate spots.',
  },
  distance: {
    eyebrow: 'Drive distance',
    title: 'How far do you want the main drive to be?',
    description: 'Pick the rough distance you are comfortable with and Roady will keep the destination in that range.',
  },
  interests: {
    eyebrow: 'Trip vibe',
    title: 'Pick a few things you love.',
    description: 'Tap as many as you want. Roady will use these to shape the route and stops.',
  },
  hotelBudget: {
    eyebrow: 'Hotel budget',
    title: "What's your hotel budget?",
    description: 'Roady will suggest a hotel at your destination to match.',
  },
  hotelDetails: {
    eyebrow: 'Hotel details',
    title: 'Hotel details',
    description: 'Roady will pre-fill your search on Booking.com so you see real availability.',
  },
  enroute: {
    eyebrow: 'Drive stops',
    title: 'Stops on the drive?',
    description: 'How many times do you want to pull over on the way there?',
  },
  spots: {
    eyebrow: 'Destination spots',
    title: 'Spots at your destination?',
    description: 'How many places do you want to explore once you arrive?',
  },
  generating: {
    eyebrow: 'Generating',
    title: 'Roady is building your trip.',
    description: 'Pulling together a route, stops, and a destination that fits the way you want to travel.',
  },
  results: {
    eyebrow: 'Roady suggestion',
    title: 'Roady picked your trip.',
    description: 'Review the route, browse stay picks, see the trip card on the right, or ask Roady for another one.',
  },
  save: {
    eyebrow: 'Save and share',
    title: 'Keep it, share it, or open it in Maps.',
    description: 'Save the trip, copy the route link, or open it directly in your maps app.',
  },
  saved: {
    eyebrow: 'Trip saved',
    title: 'Your trip is saved.',
    description: 'You can reopen it later, edit it whenever you want, and keep building from here.',
  },
};

function cloneStops(stops: PlannerStop[]): PlannerStop[] {
  return stops.map((stop) => ({ ...stop }));
}

function normalizePlannerStops(stops: Stop[]): PlannerStop[] {
  return stops.map((stop, index) => ({
    ...stop,
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${stop.name}-${index}`,
    recommended: stop.stopType === 'destination',
  }));
}

function useFadeIn(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
      onClick={() => setOpen((value) => !value)}
    >
      <div className="flex items-center justify-between px-6 py-5 gap-4">
        <span className="font-bold text-base" style={{ color: '#1B2D45' }}>
          {question}
        </span>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
          style={{ color: '#58CC02', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      {open && (
        <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

function SelectionCard({
  item,
  selected,
  onClick,
  multi = false,
}: {
  item: ChoiceCardItem;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border-2 bg-white px-5 py-4 text-left transition-all duration-150"
      style={{
        borderColor: selected ? '#58CC02' : '#E5E7EB',
        backgroundColor: selected ? 'rgba(88,204,2,0.05)' : '#ffffff',
        boxShadow: selected ? '0 14px 34px rgba(88,204,2,0.08)' : 'none',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="text-2xl">{item.emoji}</div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[15px]" style={{ color: '#1B2D45' }}>
            {item.label}
          </p>
          <p className="mt-1 text-sm text-gray-400">{item.desc}</p>
        </div>
        <div
          className="h-6 w-6 flex-shrink-0 border-2 flex items-center justify-center"
          style={{
            borderRadius: multi ? '6px' : '50%',
            borderColor: selected ? '#58CC02' : '#D1D5DB',
            backgroundColor: selected ? '#58CC02' : 'transparent',
          }}
        >
          {selected && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

function InterestChip({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150"
      style={{
        backgroundColor: selected ? '#1B2D45' : '#ffffff',
        borderColor: selected ? '#1B2D45' : '#E5E7EB',
        color: selected ? '#ffffff' : '#1B2D45',
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function NumberPill({
  value,
  selected,
  onClick,
}: {
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-20 w-20 rounded-[24px] border-2 text-2xl font-extrabold transition-all"
      style={{
        borderColor: selected ? '#1B2D45' : '#E5E7EB',
        backgroundColor: selected ? 'rgba(27,45,69,0.06)' : '#ffffff',
        color: '#1B2D45',
      }}
    >
      {value}
    </button>
  );
}

function getStartRegion(startInput: string, coords: [number, number] | null): StartRegion {
  const start = startInput.toLowerCase();
  const northHints = ['san francisco', 'oakland', 'berkeley', 'sacramento', 'napa', 'sonoma', 'san jose', 'palo alto'];
  const southHints = ['los angeles', 'san diego', 'orange county', 'anaheim', 'palm springs', 'malibu', 'santa monica'];

  if (northHints.some((hint) => start.includes(hint))) return 'north';
  if (southHints.some((hint) => start.includes(hint))) return 'south';

  if (coords) {
    return coords[1] >= 36.7 ? 'north' : 'south';
  }

  return 'south';
}

function formatMiles(miles: number) {
  return `${miles.toLocaleString()} miles`;
}

function normalizeHotelQueryText(value: string) {
  return value.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function haversineMiles(a: [number, number], b: [number, number]) {
  const lat1 = a[1] * (Math.PI / 180);
  const lat2 = b[1] * (Math.PI / 180);
  const dLat = (b[1] - a[1]) * (Math.PI / 180);
  const dLng = (b[0] - a[0]) * (Math.PI / 180);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 3958.8 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function estimateTripMiles(startCoords: [number, number] | null, stops: PlannerStop[], endCoords: [number, number]) {
  const points: [number, number][] = [];
  if (startCoords) points.push(startCoords);
  stops.forEach((stop) => points.push([stop.lng, stop.lat]));
  points.push(endCoords);

  if (points.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineMiles(points[index - 1], points[index]) * 1.18;
  }
  return Math.max(60, Math.round(total));
}

function estimateTripDaysLabel(
  prefs: PlannerPreferences,
  stopCount: number,
  fallbackLabel: string
) {
  if (prefs.hotelNights) {
    if (prefs.hotelNights.endsWith('+')) {
      const nights = Number.parseInt(prefs.hotelNights, 10);
      if (!Number.isNaN(nights)) return `${nights + 1}+ days`;
    }

    const nights = Number.parseInt(prefs.hotelNights, 10);
    if (!Number.isNaN(nights)) {
      return `${Math.max(2, nights + 1)} days`;
    }
  }

  const enroute = Number.parseInt(prefs.numberOfEnrouteStops || '0', 10);
  const destinationSpots =
    prefs.numberOfStops === 'auto'
      ? Math.max(3, stopCount - enroute)
      : Number.parseInt(prefs.numberOfStops || '3', 10);

  if (!Number.isNaN(destinationSpots)) {
    const days = Math.max(2, Math.min(7, Math.ceil((enroute + destinationSpots + 1) / 2)));
    return `${days} days`;
  }

  return fallbackLabel;
}

function getBookingSearchUrl(hotel: HotelSuggestion) {
  if (hotel.bookingUrl) return hotel.bookingUrl;
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    `${normalizeHotelQueryText(hotel.name)} ${hotel.city}`
  )}&dest_type=hotel&is_hotel=1&lang=en-us`;
}

function getHotelCardImage(hotel: HotelSuggestion) {
  return getHotelImageUrl(hotel);
}

function getHotelDestinationLabel(hotel: HotelSuggestion) {
  return hotel.address?.trim() || `${hotel.name}, ${hotel.city}`;
}

function getHotelDestinationDisplay(hotel: HotelSuggestion) {
  return hotel.city ? `${hotel.name}, ${hotel.city}` : hotel.name;
}

function getHotelLocationSummary(hotel: HotelSuggestion) {
  return hotel.city || 'Destination stay';
}

function getStopTags(stop: PlannerStop) {
  const haystack = `${stop.name} ${stop.description} ${stop.tip}`.toLowerCase();
  const tags = new Set<string>();

  if (stop.stopType === 'en-route') {
    tags.add('Drive break');
  } else {
    tags.add('Destination');
  }

  if (/\bmuseum|history|historic|gallery|exhibit|mission\b/.test(haystack)) {
    tags.add('Museum');
  } else if (/\bpark|trail|forest|garden|reserve|beach|coast|bluff|cove|harbor|plaza\b/.test(haystack)) {
    tags.add('Park');
  } else if (/\bwine|brew|bakery|restaurant|cafe|coffee|tasting|market|farm\b/.test(haystack)) {
    tags.add('Food');
  } else if (/\bart|mural|studio\b/.test(haystack)) {
    tags.add('Art');
  } else if (/\bview|scenic|lookout|overlook|sunset\b/.test(haystack)) {
    tags.add('Scenic');
  }

  const categoryFallback: Record<PlannerStop['category'], string> = {
    food: 'Food',
    culture: 'Culture',
    nature: 'Nature',
    adventure: 'Adventure',
    scenic: 'Scenic',
  };
  tags.add(categoryFallback[stop.category]);

  return Array.from(tags).slice(0, 3);
}

function ActionGlyph({
  kind,
  active = false,
}: {
  kind: 'hotel' | 'google' | 'apple' | 'copy' | 'save';
  active?: boolean;
}) {
  const stroke = active ? '#ffffff' : '#1B2D45';

  if (kind === 'hotel') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
        <path d="M3 18h18" />
        <path d="M7 9V7a2 2 0 1 1 4 0v2" />
        <path d="M14 12h3" />
      </svg>
    );
  }

  if (kind === 'google') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 8-8 10 10-8 8-2-6-8-4Z" />
        <path d="m11 3 2 12" />
      </svg>
    );
  }

  if (kind === 'apple') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (kind === 'copy') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M5 15V7a2 2 0 0 1 2-2h8" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h9l5 5V19a2 2 0 0 1-2 2Z" />
      <path d="M14 5.5V11h5" />
    </svg>
  );
}

const RESULT_STEPS = ['Preferences', 'Route', 'Stops', 'Review', 'Stay', 'Finalize'];

function ResultStepRail() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] items-center justify-center gap-2 overflow-x-auto px-1 pb-1">
      {RESULT_STEPS.map((step, index) => {
        const completed = index < 4;
        const current = index === 4;

        return (
          <div key={step} className="flex flex-shrink-0 items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold"
              style={{
                backgroundColor: completed || current ? '#13A85B' : '#ffffff',
                border: completed || current ? '0' : '2px solid #CBD5E1',
                color: completed || current ? '#ffffff' : '#94A3B8',
              }}
            >
              {completed ? (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: completed || current ? '#1B2D45' : '#94A3B8' }}
            >
              {step}
            </span>
            {index < RESULT_STEPS.length - 1 && (
              <span
                className="h-0.5 w-7 rounded-full sm:w-10"
                style={{ backgroundColor: completed ? '#CBD5E1' : '#E2E8F0' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function getCategoryIcon(category: PlannerStop['category']) {
  const icons: Record<PlannerStop['category'], string> = {
    food: '☕',
    culture: '🏛',
    nature: '🌲',
    adventure: '🥾',
    scenic: '🌄',
  };
  return icons[category];
}

function getStayTags(hotel: HotelSuggestion, preferenceLabels: string[]) {
  const tags = new Set<string>();
  if (hotel.priceRange === '$$$') tags.add('Luxury');
  else if (hotel.priceRange === '$$') tags.add('Comfort');
  else tags.add('Value');

  preferenceLabels.forEach((label) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('wine')) tags.add('Wine');
    else if (normalized.includes('beach')) tags.add('Beach');
    else if (normalized.includes('history') || normalized.includes('museum')) tags.add('Historic');
    else if (normalized.includes('coffee') || normalized.includes('baker') || normalized.includes('local food')) tags.add('Food nearby');
    else if (normalized.includes('hiking') || normalized.includes('national')) tags.add('Nature');
    else if (normalized.includes('boutique')) tags.add('Boutique');
  });

  if (tags.size < 3) tags.add('Roady pick');
  if (tags.size < 3) tags.add('Easy stop');

  return Array.from(tags).slice(0, 3);
}

function getStayTagStyle(index: number) {
  const styles = [
    { backgroundColor: 'rgba(216,90,48,0.1)', color: '#D85A30' },
    { backgroundColor: 'rgba(88,204,2,0.12)', color: '#46A302' },
    { backgroundColor: 'rgba(55,138,221,0.1)', color: '#378ADD' },
  ];
  return styles[index % styles.length];
}

function ResultStayCard({
  hotel,
  selected,
  preferenceLabels,
  onSelect,
}: {
  hotel: HotelSuggestion;
  selected: boolean;
  preferenceLabels: string[];
  onSelect: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hotelImage = imageFailed ? '' : getHotelCardImage(hotel);
  const priceLabel = hotel.fsqPrice != null ? '$'.repeat(hotel.fsqPrice) : hotel.priceRange;
  const ratingLabel = hotel.fsqRating ? hotel.fsqRating.toFixed(1) : '4.6';
  const tags = getStayTags(hotel, preferenceLabels);

  return (
    <div
      className="rounded-[22px] border bg-white p-3 transition-all"
      style={{
        borderColor: selected ? '#13A85B' : '#DDE3EA',
        boxShadow: selected ? '0 12px 30px rgba(19,168,91,0.12)' : '0 8px 22px rgba(27,45,69,0.05)',
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[136px_minmax(0,1fr)]">
        <div className="relative h-[124px] overflow-hidden rounded-[16px] bg-[#EEF2F7] sm:h-full">
          {hotelImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hotelImage}
              alt={hotel.name}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-end p-3"
              style={{
                background:
                  hotel.priceRange === '$$$'
                    ? 'linear-gradient(135deg,#1B2D45 0%,#35537A 100%)'
                    : hotel.priceRange === '$$'
                      ? 'linear-gradient(135deg,#2A5F8A 0%,#5E9AE2 100%)'
                      : 'linear-gradient(135deg,#2E4F1D 0%,#58CC02 100%)',
              }}
            >
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">Stay</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-lg font-extrabold leading-tight"
                style={{
                  color: '#1B2D45',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {hotel.name}
              </p>
              <p className="mt-1 text-sm text-gray-400">{getHotelLocationSummary(hotel)}</p>
            </div>
            {selected && (
              <span className="flex-shrink-0 rounded-full bg-[#13A85B] px-3 py-1 text-[11px] font-extrabold text-white">
                Selected
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-bold" style={{ color: '#EF9F27' }}>
              ★ {ratingLabel}
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-extrabold" style={{ color: '#13A85B' }}>
              {priceLabel}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={getStayTagStyle(index)}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSelect}
              className="rounded-[12px] px-3 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: selected ? '#13A85B' : '#1B2D45' }}
            >
              {selected ? 'Selected' : 'Select this stay'}
            </button>
            <a
              href={getBookingSearchUrl(hotel)}
              target="_blank"
              rel="noreferrer"
              className="rounded-[12px] border border-gray-200 px-3 py-2 text-center text-sm font-extrabold transition-colors hover:text-[#1B2D45]"
              style={{ color: '#1B2D45' }}
            >
              View details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteAtGlance({
  startLabel,
  stops,
  selectedHotel,
  fallbackDestination,
  activeStop,
  onStopClick,
}: {
  startLabel: string;
  stops: PlannerStop[];
  selectedHotel: HotelSuggestion | null;
  fallbackDestination: string;
  activeStop: number;
  onStopClick: (index: number) => void;
}) {
  const finalLabel = selectedHotel?.city || fallbackDestination;
  const finalSubLabel = selectedHotel ? selectedHotel.name : 'Final stop';

  return (
    <div className="rounded-[26px] border border-[#DDE3EA] bg-white p-5 shadow-[0_10px_30px_rgba(27,45,69,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F1F3F6] text-xl">
          ✨
        </span>
        <div>
          <p className="text-xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
            Your route at a glance
          </p>
          <p className="mt-1 text-sm text-gray-500">
            A relaxed drive with Roady's best stops laid out in order.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div
          className="grid min-w-[760px] items-start gap-3"
          style={{ gridTemplateColumns: `repeat(${stops.length + 2}, minmax(100px, 1fr))` }}
        >
          <div className="relative flex flex-col items-center text-center">
            <div className="absolute left-1/2 top-8 h-0.5 w-full border-t-2 border-dashed border-[#C6CED8]" />
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#13A85B] bg-[#EFFFF4] text-2xl">
              🚩
            </span>
            <span className="mt-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#13A85B] text-[11px] font-extrabold text-white">
              1
            </span>
            <p className="mt-2 text-sm font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
              {startLabel || 'Start'}
            </p>
            <p className="mt-1 text-xs font-bold" style={{ color: '#13A85B' }}>
              Start
            </p>
          </div>

          {stops.map((stop, index) => {
            const selected = activeStop === index;
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => onStopClick(index)}
                className="relative flex flex-col items-center text-center"
              >
                <div className="absolute left-1/2 top-8 h-0.5 w-full border-t-2 border-dashed border-[#C6CED8]" />
                <span
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white text-2xl transition-transform"
                  style={{
                    borderColor: selected ? '#1B2D45' : stop.stopType === 'en-route' ? '#D85A30' : '#378ADD',
                    transform: selected ? 'scale(1.06)' : 'none',
                  }}
                >
                  {getCategoryIcon(stop.category)}
                </span>
                <span
                  className="mt-3 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                  style={{ backgroundColor: stop.stopType === 'en-route' ? '#D85A30' : '#378ADD' }}
                >
                  {index + 2}
                </span>
                <p className="mt-2 text-sm font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                  {stop.name}
                </p>
                <p className="mt-1 text-xs text-gray-400">{stop.duration}</p>
                <div className="mt-2 flex justify-center gap-1.5">
                  {getStopTags(stop).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: 'rgba(55,138,221,0.1)', color: '#378ADD' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}

          <div className="relative flex flex-col items-center text-center">
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#1B66D2] bg-white text-2xl">
              🏨
            </span>
            <span className="mt-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1B66D2] text-[11px] font-extrabold text-white">
              {stops.length + 2}
            </span>
            <p className="mt-2 text-sm font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
              {finalLabel}
            </p>
            <p
              className="mt-1 text-xs font-bold"
              style={{
                color: '#1B66D2',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {finalSubLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareActionButton({
  href,
  onClick,
  label,
  sublabel,
  kind,
  primary = false,
  disabled = false,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  sublabel: string;
  kind: 'google' | 'apple' | 'copy' | 'save';
  primary?: boolean;
  disabled?: boolean;
}) {
  const className =
    'flex items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all';
  const iconWrapStyle = {
    backgroundColor: primary ? 'rgba(255,255,255,0.18)' : 'rgba(27,45,69,0.06)',
  } as const;
  const labelColor = primary ? '#ffffff' : '#1B2D45';
  const sublabelColor = primary ? 'rgba(255,255,255,0.75)' : '#9CA3AF';

  const inner = (
    <>
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl"
        style={iconWrapStyle}
      >
        <ActionGlyph kind={kind} active={primary} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold" style={{ color: labelColor }}>
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed" style={{ color: sublabelColor }}>
          {sublabel}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        style={{
          borderColor: primary ? '#58CC02' : '#E5E7EB',
          backgroundColor: primary ? '#58CC02' : '#ffffff',
        }}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className} disabled:opacity-60`}
      style={{
        borderColor: primary ? '#58CC02' : '#E5E7EB',
        backgroundColor: primary ? '#58CC02' : '#ffffff',
      }}
    >
      {inner}
    </button>
  );
}

function buildGoogleMapsUrl(start: string, stops: PlannerStop[], end: string) {
  const points = [
    encodeURIComponent(start),
    ...stops.map((stop) => `${stop.lat},${stop.lng}`),
    encodeURIComponent(end),
  ];
  return `https://www.google.com/maps/dir/${points.join('/')}`;
}

function buildAppleMapsUrl(start: string, stops: PlannerStop[], end: string) {
  const destinations = [...stops.map((stop) => `${stop.lat},${stop.lng}`), encodeURIComponent(end)].join('+to:');
  return `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${destinations}`;
}

async function fetchAddressSuggestions(query: string): Promise<string[]> {
  if (!query.trim() || query.length < 2 || !MAPBOX_TOKEN) return [];

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=us&types=place,locality,neighborhood,address&limit=5`
    );
    const data = await response.json();
    return (data.features ?? []).map((feature: { place_name: string }) => feature.place_name);
  } catch {
    return [];
  }
}

async function reverseGeocodeLabel(lng: number, lat: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place,locality&limit=1`
    );
    const data = await response.json();
    return data.features?.[0]?.text ?? data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

function buildQuestionSteps(prefs: PlannerPreferences): PlannerStep[] {
  const steps: PlannerStep[] = ['start', 'group'];
  if (prefs.travelGroup === 'family-kids') steps.push('kids');
  steps.push('distance', 'interests', 'hotelBudget');
  if (prefs.hotelPreference && prefs.hotelPreference !== 'none') steps.push('hotelDetails');
  steps.push('enroute', 'spots');
  return steps;
}

function pickSeedRouteId(prefs: PlannerPreferences, currentSeed: PlannerRouteKey): PlannerRouteKey {
  const interests = new Set(prefs.interests);

  const scores: Record<PlannerRouteKey, number> = {
    pch: currentSeed === 'pch' ? 1 : 0,
    parks: currentSeed === 'parks' ? 1 : 0,
    desert: currentSeed === 'desert' ? 1 : 0,
    custom: currentSeed === 'custom' ? 1 : 0,
  };

  if (interests.has('beaches') || interests.has('surf') || interests.has('sunsets') || interests.has('wine') || interests.has('local-food')) {
    scores.pch += 4;
  }
  if (interests.has('hiking') || interests.has('camping') || interests.has('wildlife') || interests.has('national-parks')) {
    scores.parks += 4;
  }
  if (interests.has('adventure') || interests.has('road-stops') || interests.has('photography')) {
    scores.desert += 3;
  }
  if (interests.has('scenic')) {
    scores.pch += 2;
    scores.custom += 1;
  }
  if (interests.has('coffee') || interests.has('breweries') || interests.has('bakeries') || interests.has('boutique-shops')) {
    scores.custom += 2;
  }

  if (prefs.travelGroup === 'family-kids') {
    scores.parks += 2;
    scores.custom += 2;
  }
  if (prefs.travelGroup === 'partner') {
    scores.pch += 2;
    scores.desert += 1;
  }
  if (prefs.travelGroup === 'friends') {
    scores.desert += 2;
    scores.custom += 1;
  }

  if (prefs.distancePreference === 'under-150') {
    scores.custom += 2;
    scores.pch += 1;
  }
  if (prefs.distancePreference === '150-plus') {
    scores.parks += 1;
    scores.desert += 2;
  }

  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as PlannerRouteKey) ?? currentSeed;
}

function buildFallbackRouteOptions(
  routeRegion: StartRegion,
  prefs: PlannerPreferences,
  currentSeed: PlannerRouteKey,
  startCoords: [number, number] | null
): SuggestedRouteOption[] {
  const preferredSeed = pickSeedRouteId(prefs, currentSeed);

  return [...PLANNER_ROUTE_ORDER]
    .sort((a, b) => {
      const aVariant = PLANNER_ROUTE_DEFINITIONS[a][routeRegion];
      const bVariant = PLANNER_ROUTE_DEFINITIONS[b][routeRegion];
      const aScore = pickSeedRouteId(prefs, a) === a ? 1 : 0;
      const bScore = pickSeedRouteId(prefs, b) === b ? 1 : 0;
      const aDistance = startCoords ? haversineMiles(startCoords, aVariant.destinationCoords) : null;
      const bDistance = startCoords ? haversineMiles(startCoords, bVariant.destinationCoords) : null;

      const fitDistanceScore = (distance: number | null) => {
        if (distance == null || prefs.distancePreference === 'surprise' || !prefs.distancePreference) return 0;
        if (prefs.distancePreference === 'under-150') return distance <= 150 ? 2 : -1;
        if (prefs.distancePreference === '150-plus') return distance >= 150 ? 2 : -1;
        return 0;
      };

      const totalScore = (routeId: PlannerRouteKey, distance: number | null, seedScore: number) =>
        fitDistanceScore(distance) + seedScore + (routeId === preferredSeed ? 2 : 0);

      return totalScore(b, bDistance, bScore) - totalScore(a, aDistance, aScore);
    })
    .slice(0, 3)
    .map((routeId, index) => {
      const variant = PLANNER_ROUTE_DEFINITIONS[routeId][routeRegion];
      return {
        id: `${routeId}-${index + 1}`,
        name: variant.routeName,
        tagline: variant.tagline,
        via: variant.highlights.join(', '),
        destination: variant.destination,
        icon: ROUTE_ICONS[routeId],
        fallbackRouteId: routeId,
      };
    });
}

function stripPlannerStop(stop: PlannerStop): Stop {
  const { id, recommended, ...rest } = stop;
  void id;
  void recommended;
  return rest;
}

function HomeContent() {
  const router = useRouter();
  const howFade = useFadeIn(0.08);
  const routesFade = useFadeIn(0.08);
  const saveFade = useFadeIn(0.08);
  const faqFade = useFadeIn(0.08);

  const [mapAnimation, setMapAnimation] = useState<object | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [plannerStep, setPlannerStep] = useState<PlannerStep>('start');
  const [seedRouteId, setSeedRouteId] = useState<PlannerRouteKey>('pch');
  const [startInput, setStartInput] = useState('');
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PlannerPreferences>(DEFAULT_PREFS);
  const [routeOptions, setRouteOptions] = useState<SuggestedRouteOption[]>([]);
  const [routeOptionIndex, setRouteOptionIndex] = useState(0);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [stops, setStops] = useState<PlannerStop[]>([]);
  const [mapEndCoords, setMapEndCoords] = useState<[number, number] | null>(null);
  const [activeStop, setActiveStop] = useState(-1);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState(0);
  const [hotelCarouselIndex, setHotelCarouselIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [didTryAutoLocate, setDidTryAutoLocate] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const suggestionRef = useRef<HTMLDivElement>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveOnRestoreRef = useRef(false);

  const routeRegion = getStartRegion(startInput, startCoords);
  const fallbackRoute = PLANNER_ROUTE_DEFINITIONS[seedRouteId][routeRegion];
  const activeRouteOption = routeOptions[routeOptionIndex] ?? null;
  const routeDestination = activeRouteOption?.destination ?? fallbackRoute.destination;
  const routeName = tripData?.routeName ?? activeRouteOption?.name ?? fallbackRoute.routeName;
  const routeTagline = tripData?.tagline ?? activeRouteOption?.tagline ?? fallbackRoute.tagline;
  const routeSummary = tripData?.destinationDescription ?? fallbackRoute.summary;
  const questionSteps = buildQuestionSteps(prefs);
  const mapStops = useMemo(() => stops.map(stripPlannerStop), [stops]);
  const progressSteps =
    plannerStep === 'generating' || plannerStep === 'results' || plannerStep === 'save' || plannerStep === 'saved'
      ? [...questionSteps, 'results', 'save']
      : questionSteps;
  const plannerIndex =
    plannerStep === 'saved'
      ? progressSteps.length - 1
      : plannerStep === 'generating'
        ? Math.max(questionSteps.length - 1, 0)
        : Math.max(progressSteps.indexOf(plannerStep), 0);
  const currentPlannerMeta = PLANNER_META[plannerStep];
  const previewInterests = prefs.interests.slice(0, 4).map((interest) => INTEREST_LABELS[interest] ?? interest);
  const previewHotel = prefs.hotelPreference ? HOTEL_LABELS[prefs.hotelPreference] : '';
  const previewDistance =
    prefs.distancePreference && prefs.distancePreference !== 'surprise'
      ? DISTANCE_LABELS[prefs.distancePreference]
      : prefs.distancePreference === 'surprise'
        ? 'Roady picks the distance'
        : '';
  const visibleHotels = tripData?.hotels?.slice(0, 4) ?? [];
  const selectedHotel = visibleHotels[selectedHotelIndex] ?? visibleHotels[0] ?? null;
  const selectedHotelDestination = selectedHotel ? getHotelDestinationLabel(selectedHotel) : '';
  const tripDestinationDisplay = selectedHotel ? getHotelDestinationDisplay(selectedHotel) : routeDestination;
  const tripDestinationLabel = selectedHotelDestination || routeDestination;
  const hotelEndCoords =
    selectedHotel?.lat != null && selectedHotel?.lng != null
      ? ([selectedHotel.lng, selectedHotel.lat] as [number, number])
      : null;
  const endCoords = hotelEndCoords ?? mapEndCoords ?? fallbackRoute.destinationCoords;
  const tripMiles = tripData?.totalMiles ?? estimateTripMiles(startCoords, stops, endCoords);
  const tripDaysLabel = estimateTripDaysLabel(prefs, stops.length, fallbackRoute.durationLabel);
  const googleMapsUrl = startInput ? buildGoogleMapsUrl(startInput, stops, tripDestinationLabel) : '#';
  const appleMapsUrl = startInput ? buildAppleMapsUrl(startInput, stops, tripDestinationLabel) : '#';
  const greenButtonStyle = { backgroundColor: '#58CC02', boxShadow: '0 18px 44px rgba(88,204,2,0.22)' };

  function resetSuggestedTrip(clearMessages = true) {
    setTripData(null);
    setRouteOptions([]);
    setRouteOptionIndex(0);
    setStops([]);
    setMapEndCoords(null);
    setActiveStop(-1);
    setSelectedHotelIndex(0);
    setHotelCarouselIndex(0);
    if (clearMessages) {
      setPlannerError('');
      setSaveMessage('');
      setShareMessage('');
    }
  }

  useEffect(() => {
    fetch('/map-search.json')
      .then((response) => response.json())
      .then((data) => setMapAnimation(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setStartSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!plannerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [plannerOpen]);

  useEffect(() => {
    const saved = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as PersistedPlannerState;
      window.localStorage.removeItem(PLANNER_STORAGE_KEY);
      autoSaveOnRestoreRef.current = Boolean(parsed.autoSaveOnRestore);
      setPlannerOpen(true);
      requestAnimationFrame(() => setPlannerVisible(true));
      setPlannerStep(parsed.step);
      setSeedRouteId(parsed.seedRouteId);
      setStartInput(parsed.startInput);
      setStartCoords(parsed.startCoords);
      setPrefs(parsed.prefs);
      setRouteOptions(parsed.routeOptions);
      setRouteOptionIndex(parsed.routeOptionIndex);
      setTripData(parsed.tripData);
      setStops(parsed.stops);
      setMapEndCoords(parsed.mapEndCoords);
      setSelectedHotelIndex(parsed.selectedHotelIndex ?? 0);
      setHotelCarouselIndex(parsed.hotelCarouselIndex ?? parsed.selectedHotelIndex ?? 0);
      setActiveStop(-1);
    } catch {
      window.localStorage.removeItem(PLANNER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!plannerOpen || plannerStep !== 'start' || didTryAutoLocate) return;
    setDidTryAutoLocate(true);
    void detectCurrentLocation(false);
  }, [plannerOpen, plannerStep, didTryAutoLocate]);

  useEffect(() => {
    if (selectedHotelIndex < visibleHotels.length) return;
    setSelectedHotelIndex(0);
  }, [selectedHotelIndex, visibleHotels.length]);

  useEffect(() => {
    if (hotelCarouselIndex < visibleHotels.length) return;
    setHotelCarouselIndex(0);
  }, [hotelCarouselIndex, visibleHotels.length]);

  useEffect(() => {
    if (!plannerOpen || !selectedHotel || !tripData?.hotels || !MAPBOX_TOKEN) return;
    if (selectedHotel.address && selectedHotel.lat != null && selectedHotel.lng != null) return;

    let cancelled = false;

    const resolveSelectedHotel = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            `${selectedHotel.name}, ${selectedHotel.city}, California`
          )}.json?access_token=${MAPBOX_TOKEN}&country=us&types=poi,address,place&limit=1`
        );
        const data = await response.json();
        const feature = data.features?.[0];
        if (!feature || cancelled) return;

        const [lng, lat] = feature.center ?? [];
        const address = feature.place_name as string | undefined;

        setTripData((currentTrip) => {
          if (!currentTrip?.hotels) return currentTrip;
          const hotels = currentTrip.hotels.map((hotel, index) =>
            index === selectedHotelIndex
              ? {
                  ...hotel,
                  lat: hotel.lat ?? lat,
                  lng: hotel.lng ?? lng,
                  address: hotel.address ?? address,
                }
              : hotel
          );
          return { ...currentTrip, hotels };
        });
      } catch {
        // Keep the current hotel card info if geocoding fails.
      }
    };

    void resolveSelectedHotel();

    return () => {
      cancelled = true;
    };
  }, [
    plannerOpen,
    selectedHotel,
    selectedHotelIndex,
    tripData?.hotels,
  ]);

  useEffect(() => {
    if (!plannerOpen || !tripData?.hotels?.length) return;

    const hotelsNeedingPhotos = tripData.hotels
      .slice(0, 4)
      .map((hotel, index) => ({ hotel, index }))
      .filter(
        ({ hotel }) =>
          !hotel.photoLookupTried &&
          !getHotelImageUrl(hotel, {
            includeFallback: false,
            includeKnownFallbackAsReal: false,
          })
      );

    if (!hotelsNeedingPhotos.length) return;

    let cancelled = false;

    const loadHotelPhotos = async () => {
      const results = await Promise.all(
        hotelsNeedingPhotos.map(async ({ hotel, index }) => {
          try {
            const response = await fetch('/api/hotel-photo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: hotel.name, city: hotel.city }),
            });

            if (!response.ok) {
              return { index, photoLookupTried: true };
            }

            const data = await response.json();
            return {
              index,
              fsqPhoto: data.photoUrl as string | undefined,
              fsqWebsite: data.website as string | undefined,
              photoLookupTried: true,
            };
          } catch {
            return { index, photoLookupTried: true };
          }
        })
      );

      if (cancelled) return;

      setTripData((currentTrip) => {
        if (!currentTrip?.hotels) return currentTrip;

        const hotels = currentTrip.hotels.map((hotel, index) => {
          const enrichment = results.find((item) => item.index === index);
          if (!enrichment) return hotel;

          return {
            ...hotel,
            fsqPhoto:
              getHotelImageUrl(hotel, { includeFallback: false, includeKnownFallbackAsReal: false }) ||
              enrichment.fsqPhoto ||
              hotel.fsqPhoto,
            fsqWebsite: hotel.fsqWebsite || enrichment.fsqWebsite,
            photoLookupTried: true,
          };
        });

        return { ...currentTrip, hotels };
      });
    };

    void loadHotelPhotos();

    return () => {
      cancelled = true;
    };
  }, [plannerOpen, tripData?.hotels]);

  useEffect(() => {
    if (!user || !autoSaveOnRestoreRef.current) return;
    autoSaveOnRestoreRef.current = false;
    void handleSaveTrip(true);
  }, [user]);

  useEffect(() => {
    if (plannerStep !== 'start') return;
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);

    if (startInput.trim().length < 2) {
      setStartSuggestions([]);
      return;
    }

    suggestionTimerRef.current = setTimeout(async () => {
      const suggestions = await fetchAddressSuggestions(startInput);
      setStartSuggestions(suggestions);
    }, 220);

    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    };
  }, [plannerStep, startInput]);

  async function detectCurrentLocation(autoAdvance: boolean) {
    if (!navigator.geolocation || detectingLocation) return;

    setDetectingLocation(true);
    setPlannerError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const locationCoords: [number, number] = [coords.longitude, coords.latitude];
        const label =
          (await reverseGeocodeLabel(coords.longitude, coords.latitude)) ?? 'Current location';

        resetSuggestedTrip();
        setStartInput(label);
        setStartCoords(locationCoords);
        setStartSuggestions([]);
        setDetectingLocation(false);

        if (autoAdvance) {
          setTimeout(() => setPlannerStep('group'), 220);
        }
      },
      () => {
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function applyStartSelection(value: string, coords?: [number, number] | null, autoAdvance = true) {
    resetSuggestedTrip();
    setStartInput(value);
    setStartSuggestions([]);

    if (coords) {
      setStartCoords(coords);
    } else {
      try {
        const resolved = await geocode(value);
        setStartCoords(resolved);
      } catch {
        setStartCoords(null);
      }
    }

    if (autoAdvance) {
      setTimeout(() => setPlannerStep('group'), 220);
    }
  }

  function openPlanner(routeId: PlannerRouteKey = 'pch') {
    setSeedRouteId(routeId);
    setPlannerStep('start');
    setPlannerOpen(true);
    setPlannerVisible(false);
    setStartInput('');
    setStartCoords(null);
    setStartSuggestions([]);
    setPrefs(DEFAULT_PREFS);
    setTripData(null);
    setRouteOptions([]);
    setRouteOptionIndex(0);
    setStops([]);
    setMapEndCoords(null);
    setActiveStop(-1);
    setSelectedHotelIndex(0);
    setHotelCarouselIndex(0);
    setPlannerError('');
    setSaveMessage('');
    setShareMessage('');
    setSavedTripId(null);
    setDidTryAutoLocate(false);
    requestAnimationFrame(() => setPlannerVisible(true));
  }

  function closePlanner() {
    setPlannerVisible(false);
    setTimeout(() => {
      setPlannerOpen(false);
    }, 260);
  }

  function persistPlannerState(autoSaveOnRestore = false) {
    const state: PersistedPlannerState = {
      step: plannerStep === 'saved' ? 'save' : plannerStep,
      seedRouteId,
      startInput,
      startCoords,
      prefs,
      routeOptions,
      routeOptionIndex,
      tripData,
      stops,
      mapEndCoords,
      selectedHotelIndex,
      hotelCarouselIndex,
      autoSaveOnRestore,
    };
    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
  }

  function buildTripData(): TripData {
    return {
      routeName,
      tagline: routeTagline,
      totalMiles: tripMiles,
      stops: stops.map(stripPlannerStop),
      hotels: tripData?.hotels,
      completed: true,
      destinationDescription: routeSummary,
      selectedHotelName: selectedHotel?.name,
      selectedHotelAddress: selectedHotel?.address,
      plannerAnswers: {
        travelGroup: prefs.travelGroup,
        kidsAges: prefs.kidsAges,
        distancePreference: prefs.distancePreference,
        interests: prefs.interests,
        hotelPreference: prefs.hotelPreference,
        hotelGuests: prefs.hotelGuests,
        hotelCheckin: prefs.hotelCheckin,
        hotelNights: prefs.hotelNights,
        numberOfEnrouteStops: prefs.numberOfEnrouteStops,
        numberOfStops: prefs.numberOfStops,
      },
      funFacts: tripData?.funFacts ?? [fallbackRoute.estimateNote],
      tripChecklist: tripData?.tripChecklist ?? [
        'Download offline maps before you leave.',
        'Check weather and closures the night before.',
        'Book key stays or permits ahead of time.',
      ],
    };
  }

  async function loadTripForRoute(
    option: SuggestedRouteOption,
    options = routeOptions,
    optionIndex = routeOptionIndex
  ) {
    setPlannerStep('generating');
    setPlannerError('');
    setSaveMessage('');
    setShareMessage('');

    const fallbackVariant =
      PLANNER_ROUTE_DEFINITIONS[option.fallbackRouteId ?? seedRouteId][routeRegion];

    let endPoint: [number, number] = fallbackVariant.destinationCoords;
    try {
      endPoint = await geocode(option.destination);
    } catch {
      endPoint = fallbackVariant.destinationCoords;
    }

    setMapEndCoords(endPoint);

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startInput,
          end: option.destination,
          routeHint: option.name,
          travelGroup: prefs.travelGroup,
          kidsAges: prefs.kidsAges.join(','),
          distance: prefs.distancePreference === 'surprise' ? '' : prefs.distancePreference,
          interests: prefs.interests.join(','),
          hotelPreference: prefs.hotelPreference,
          hotelGuests: prefs.hotelGuests,
          hotelCheckin: prefs.hotelCheckin,
          hotelNights: prefs.hotelNights,
          numberOfEnrouteStops: prefs.numberOfEnrouteStops,
          numberOfStops: prefs.numberOfStops,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Unable to generate the trip.');
      }

      const data: TripData = await response.json();
      setTripData({
        ...data,
        routeName: data.routeName || option.name,
        tagline: data.tagline || option.tagline,
      });
      setStops(normalizePlannerStops(data.stops));
      setRouteOptions(options);
      setRouteOptionIndex(optionIndex);
      setActiveStop(-1);
      setSelectedHotelIndex(0);
      setHotelCarouselIndex(0);
      setPlannerStep('results');
      return;
    } catch {
      const fallbackStops = cloneStops(fallbackVariant.stops);
      const fallbackHotelNames =
        prefs.hotelPreference === '$$$'
          ? ['Grand Hotel', 'Resort & Spa', 'Historic Suites', 'Coastal House']
          : prefs.hotelPreference === '$$'
            ? ['Inn & Suites', 'Plaza Hotel', 'Foundry Hotel', 'Harbor Hotel']
            : ['Motor Lodge', 'Roadside Inn', 'Stay & Suites', 'Sunset Inn'];
      const fallbackTrip: TripData = {
        routeName: option.name || fallbackVariant.routeName,
        tagline: option.tagline || fallbackVariant.tagline,
        totalMiles: estimateTripMiles(startCoords, fallbackStops, fallbackVariant.destinationCoords),
        stops: fallbackStops.map(stripPlannerStop),
        hotels:
          prefs.hotelPreference && prefs.hotelPreference !== 'none'
            ? fallbackHotelNames.map((suffix) => ({
                name: `${fallbackVariant.destination} ${suffix}`,
                city: fallbackVariant.destination,
                priceRange: prefs.hotelPreference as '$' | '$$' | '$$$',
                bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                  `${fallbackVariant.destination} ${suffix} ${fallbackVariant.destination}`
                )}&dest_type=hotel&is_hotel=1&lang=en-us`,
              }))
            : undefined,
        completed: true,
        destinationDescription: fallbackVariant.summary,
        funFacts: [fallbackVariant.estimateNote],
        tripChecklist: [
          'Download offline maps before you leave.',
          'Check weather and closures the night before.',
          'Keep some flexibility around your longest stop.',
        ],
      };

      setTripData(fallbackTrip);
      setStops(fallbackStops);
      setRouteOptions(options);
      setRouteOptionIndex(optionIndex);
      setActiveStop(-1);
      setSelectedHotelIndex(0);
      setHotelCarouselIndex(0);
      setMapEndCoords(fallbackVariant.destinationCoords);
      setPlannerError('Roady is showing a curated route while live suggestions warm up.');
      setPlannerStep('results');
    }
  }

  async function generateSuggestedTrip(excludeDestinations: string[] = []) {
    if (!startInput.trim()) {
      setPlannerStep('start');
      return;
    }

    const preferredSeed = pickSeedRouteId(prefs, seedRouteId);
    setSeedRouteId(preferredSeed);
    setPlannerStep('generating');
    setPlannerError('');
    setSaveMessage('');
    setShareMessage('');

    let options: SuggestedRouteOption[] = [];

    try {
      const response = await fetch('/api/suggest-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startInput,
          distance: prefs.distancePreference === 'surprise' ? '' : prefs.distancePreference,
          travelGroup: prefs.travelGroup,
          interests: prefs.interests.join(','),
          numberOfEnrouteStops: prefs.numberOfEnrouteStops,
          excludeDestinations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Unable to suggest routes.');
      }

      const data = (await response.json()) as SuggestedRouteOption[];
      options = data.map((option) => ({
        ...option,
        fallbackRouteId: option.fallbackRouteId ?? preferredSeed,
      }));
    } catch {
      options = buildFallbackRouteOptions(routeRegion, prefs, preferredSeed, startCoords);
      setPlannerError('Roady is using curated route ideas for this suggestion.');
    }

    if (!options.length) {
      options = buildFallbackRouteOptions(routeRegion, prefs, preferredSeed, startCoords);
    }

    setRouteOptions(options);
    setRouteOptionIndex(0);
    await loadTripForRoute(options[0], options, 0);
  }

  async function handleSuggestNewRoute() {
    setPlannerError('');
    setSaveMessage('');
    setShareMessage('');

    if (routeOptions.length > routeOptionIndex + 1) {
      const nextIndex = routeOptionIndex + 1;
      await loadTripForRoute(routeOptions[nextIndex], routeOptions, nextIndex);
      return;
    }

    await generateSuggestedTrip(routeOptions.map((option) => option.destination));
  }

  async function handleSaveTrip(autoTriggered = false) {
    if (!startInput.trim()) {
      setPlannerStep('start');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/save-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startInput,
          end: tripDestinationLabel,
          trip_data: buildTripData(),
        }),
      });

      if (response.status === 401) {
        persistPlannerState(true);
        router.push('/login?next=/');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to save trip right now.');
      }

      const data = await response.json();
      setSavedTripId(data.id);
      setPlannerStep('saved');
      setSaveMessage(autoTriggered ? 'Signed in and saved automatically.' : 'Trip saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save trip right now.';
      setSaveMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    if (!startInput.trim()) return;

    try {
      await navigator.clipboard.writeText(googleMapsUrl);
      setShareMessage('Trip link copied.');
    } catch {
      setShareMessage('Unable to copy the trip link right now.');
    }
  }

  function toggleKidsAge(ageId: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({
      ...currentPrefs,
      kidsAges: currentPrefs.kidsAges.includes(ageId)
        ? currentPrefs.kidsAges.filter((item) => item !== ageId)
        : [...currentPrefs.kidsAges, ageId],
    }));
  }

  function toggleInterest(interestId: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({
      ...currentPrefs,
      interests: currentPrefs.interests.includes(interestId)
        ? currentPrefs.interests.filter((item) => item !== interestId)
        : [...currentPrefs.interests, interestId],
    }));
  }

  function setTravelGroup(travelGroup: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({
      ...currentPrefs,
      travelGroup,
      kidsAges: travelGroup === 'family-kids' ? currentPrefs.kidsAges : [],
    }));
  }

  function setDistancePreference(distancePreference: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({ ...currentPrefs, distancePreference }));
  }

  function setHotelPreference(hotelPreference: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({
      ...currentPrefs,
      hotelPreference,
      hotelGuests: hotelPreference === 'none' ? '' : currentPrefs.hotelGuests,
      hotelCheckin: hotelPreference === 'none' ? '' : currentPrefs.hotelCheckin,
      hotelNights: hotelPreference === 'none' ? '' : currentPrefs.hotelNights,
    }));
  }

  function setEnrouteStops(numberOfEnrouteStops: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({ ...currentPrefs, numberOfEnrouteStops }));
  }

  function setDestinationSpots(numberOfStops: string) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => ({ ...currentPrefs, numberOfStops }));
  }

  function canProceed(step: PlannerStep) {
    switch (step) {
      case 'start':
        return Boolean(startInput.trim());
      case 'group':
        return Boolean(prefs.travelGroup);
      case 'kids':
        return prefs.kidsAges.length > 0;
      case 'distance':
        return Boolean(prefs.distancePreference);
      case 'interests':
        return prefs.interests.length > 0;
      case 'hotelBudget':
        return Boolean(prefs.hotelPreference);
      case 'hotelDetails':
        return Boolean(prefs.hotelGuests && prefs.hotelCheckin && prefs.hotelNights);
      case 'enroute':
        return Boolean(prefs.numberOfEnrouteStops);
      case 'spots':
        return Boolean(prefs.numberOfStops);
      case 'results':
        return Boolean(tripData || stops.length > 0);
      default:
        return false;
    }
  }

  async function handleContinue() {
    if (plannerStep === 'spots') {
      await generateSuggestedTrip();
      return;
    }

    if (plannerStep === 'results') {
      setPlannerStep('save');
      return;
    }

    const currentIndex = questionSteps.indexOf(plannerStep);
    if (currentIndex >= 0 && currentIndex < questionSteps.length - 1) {
      setPlannerStep(questionSteps[currentIndex + 1]);
    }
  }

  function handleBack() {
    if (plannerStep === 'results') {
      setPlannerStep('spots');
      return;
    }

    if (plannerStep === 'save') {
      setPlannerStep('results');
      return;
    }

    const currentIndex = questionSteps.indexOf(plannerStep);
    if (currentIndex <= 0) {
      closePlanner();
      return;
    }

    setPlannerStep(questionSteps[currentIndex - 1]);
  }

  const routeCards = PLANNER_ROUTE_ORDER.map((routeId) => {
    const definition = PLANNER_ROUTE_DEFINITIONS[routeId][routeRegion];
    return { routeId, definition };
  });

  const navLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Destinations', href: '/destinations' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#save-share' },
    { label: 'Blog', href: '/#stories' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar
        logoHeight={44}
        logoOffsetY={8}
        logoHref="/"
        navLinks={navLinks}
        onPrimaryAction={() => openPlanner('pch')}
        primaryLabel="Start planning"
        signedInPrimaryLabel="Start planning"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
      />

      <section
        className="relative overflow-hidden pt-28 pb-14 sm:pt-32 lg:pt-36 lg:pb-20"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            background:
              'radial-gradient(circle at 12% 18%, rgba(216,90,48,0.08) 0%, transparent 32%), radial-gradient(circle at 52% 44%, rgba(255,209,115,0.08) 0%, transparent 32%), radial-gradient(circle at 84% 80%, rgba(88,204,2,0.05) 0%, transparent 24%)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-12">
            <div className="flex-1 max-w-xl">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
                style={{
                  backgroundColor: 'rgba(216,90,48,0.08)',
                  color: '#D85A30',
                  border: '1px solid rgba(216,90,48,0.16)',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.25 8.25 13.7l1.5-4.5L6 6.5h4.5z" />
                </svg>
                The easiest way to plan epic road trips
              </div>

              <h1
                className="font-extrabold leading-[1.02] tracking-tight"
                style={{ color: '#1B2D45', fontSize: 'clamp(2.9rem, 7vw, 5.1rem)' }}
              >
                Plan your trip
                <br />
                right now
                <br />
                <span
                  style={{
                    color: '#D85A30',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: '0.9em',
                  }}
                >
                  in 30 seconds
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-lg leading-relaxed" style={{ color: '#6B7280' }}>
                Create the perfect road trip in minutes. Roady asks a few smart questions, then
                suggests a trip that already feels tailored to you.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <button
                  onClick={() => openPlanner('pch')}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white transition-all hover:opacity-90"
                  style={greenButtonStyle}
                >
                  Plan my trip now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['#D85A30', '#378ADD', '#58CC02', '#EF9F27'].map((color, index) => (
                      <div
                        key={color}
                        className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ backgroundColor: color, zIndex: 4 - index }}
                      >
                        {['J', 'M', 'S', 'A'][index]}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                    Join <span style={{ color: '#1B2D45' }}>20,000+</span> happy road trippers
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-[920px] flex-1">
              <button
                type="button"
                onClick={() => openPlanner('pch')}
                aria-label="Open Roady planner"
                className="group relative block w-full text-left transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative min-h-[380px] sm:min-h-[480px] lg:min-h-[620px]">
                  <img
                    src="/roady%2Bbg-clean.png"
                    alt="Roady hero artwork"
                    className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03] lg:object-right"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-6 pb-20" style={{ backgroundColor: '#ffffff' }}>
        <div
          ref={howFade.ref}
          className="max-w-6xl mx-auto transition-all duration-700"
          style={{
            opacity: howFade.visible ? 1 : 0,
            transform: howFade.visible ? 'none' : 'translateY(24px)',
          }}
        >
          <button
            type="button"
            onClick={() => openPlanner('pch')}
            aria-label="Open Roady planner"
            className="block w-full overflow-hidden rounded-[34px] transition-transform duration-300 hover:-translate-y-1"
          >
            <img
              src="/how%20roady%20works.png"
              alt="How Roady works"
              className="mx-auto block h-auto w-full max-w-[1180px]"
            />
          </button>
        </div>
      </section>

      <section id="features" className="py-20 px-6" style={{ backgroundColor: '#F8FAFB' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[30px] bg-white p-8 shadow-[0_18px_48px_rgba(27,45,69,0.08)]">
              <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: '#D85A30' }}>
                Planner-first flow
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                This feels like entering a tool, not opening a page.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
                The trip planner now opens as a full-screen workspace, asks a short sequence of
                smart preference questions, and turns those answers into a Roady suggestion.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  'Smooth transition into a dedicated planner surface',
                  'Question-driven flow with tap-to-select answers',
                  'Route suggestion and trip card generated from preferences',
                  'Save, export, and phone-friendly sharing at the end',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-100 bg-[#FAFAF9] px-4 py-4 text-sm font-semibold text-gray-600"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/80 p-8 shadow-[0_18px_48px_rgba(27,45,69,0.08)]" style={{ backgroundColor: '#1B2D45' }}>
              <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: '#F8C9B8' }}>
                Quick preview
              </p>
              <div className="mt-6 space-y-5">
                {[
                  { title: 'Live starting point', body: 'Autofill, current location, and popular launch cities reduce friction instantly.' },
                  { title: 'Preference-first suggestions', body: 'Roady learns who is coming, what you like, and how you want the trip to feel.' },
                  { title: 'Trip card on the right', body: 'The suggested route lands visually, with a map, summary, and a simple way to ask for another one.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/8 px-5 py-5">
                    <p className="font-extrabold text-base text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/72">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="py-20 px-6" style={{ backgroundColor: '#F9FAFB' }}>
        <div
          ref={routesFade.ref}
          className="max-w-6xl mx-auto transition-all duration-700"
          style={{
            opacity: routesFade.visible ? 1 : 0,
            transform: routesFade.visible ? 'none' : 'translateY(24px)',
          }}
        >
          <div className="mb-12">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
              Pick your road trip vibe
            </h2>
            <p className="text-gray-500 text-lg">
              These route families still seed the planner and help Roady recover gracefully when needed.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {routeCards.map(({ routeId, definition }) => (
              <div
                key={routeId}
                className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_14px_40px_rgba(27,45,69,0.08)]"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={definition.image}
                    alt={definition.routeName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    {definition.durationLabel}
                  </div>
                  <div className="absolute left-4 right-4 bottom-4">
                    <p className="text-xl font-extrabold text-white">{PLANNER_ROUTE_DEFINITIONS[routeId].label}</p>
                    <p className="mt-1 text-sm text-white/80">{definition.vibe}</p>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm leading-relaxed text-gray-500">{definition.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {definition.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(216,90,48,0.1)', color: '#D85A30' }}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => openPlanner(routeId)}
                    className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#1B2D45' }}
                  >
                    Plan this route
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="save-share" className="py-20 px-6" style={{ backgroundColor: '#ffffff' }}>
        <div
          ref={saveFade.ref}
          className="max-w-6xl mx-auto transition-all duration-700"
          style={{
            opacity: saveFade.visible ? 1 : 0,
            transform: saveFade.visible ? 'none' : 'translateY(24px)',
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-[30px] p-8 shadow-[0_18px_48px_rgba(27,45,69,0.08)]" style={{ backgroundColor: '#1B2D45' }}>
              <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: '#F8C9B8' }}>
                Save and share
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-white">
                Save the trip once and keep moving.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/75">
                The planner ends where growth happens: save your trip, copy a shareable route
                link, or open it directly in your maps app.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Save your trip',
                  body: 'One-click Google sign-in keeps the whole itinerary attached to your account.',
                },
                {
                  title: 'Copy the link',
                  body: 'Grab a shareable route link instantly when you want to send the trip somewhere else.',
                },
                {
                  title: 'Open in Maps',
                  body: 'Jump straight into Google Maps or Apple Maps when it is time to go.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-gray-100 bg-[#FAFAF9] p-6 shadow-sm"
                >
                  <p className="font-extrabold text-lg" style={{ color: '#1B2D45' }}>
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6" style={{ backgroundColor: '#ffffff' }} id="faq">
        <div
          ref={faqFade.ref}
          className="max-w-3xl mx-auto transition-all duration-700"
          style={{
            opacity: faqFade.visible ? 1 : 0,
            transform: faqFade.visible ? 'none' : 'translateY(24px)',
          }}
        >
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
              Frequently asked questions
            </h2>
            <p className="text-gray-500 text-lg">Everything you need to know before hitting the road.</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Does the planner still feel fast?',
                a: 'Yes. The route now comes after a short preference flow, but every answer is tap-to-select and the suggestion step lands immediately afterward.',
              },
              {
                q: 'Can I ask Roady for another route?',
                a: 'Yes. Once the trip is suggested, you can tap Suggest a new route and Roady will cycle to another destination idea.',
              },
              {
                q: 'What happens if I am not signed in?',
                a: 'Roady saves your in-progress planner state locally, sends you through Google sign-in, and brings you back ready to finish saving the trip.',
              },
              {
                q: 'Can I open the route on my phone?',
                a: 'Yes. The final step includes direct Google Maps and Apple Maps actions, plus a shareable copied link.',
              },
            ].map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-gray-100" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Roady. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-gray-400 hover:text-[#46a302] transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-gray-400 hover:text-[#46a302] transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>

      {plannerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className={`absolute inset-0 transition-opacity duration-300 ${
              plannerVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundColor: 'rgba(27,45,69,0.28)', backdropFilter: 'blur(6px)' }}
            onClick={closePlanner}
            aria-label="Close planner"
          />

          <div className="relative flex h-full w-full items-end justify-center sm:items-center sm:p-4">
            <div
              className={`relative h-full w-full overflow-hidden bg-[#F3F4F2] shadow-[0_36px_120px_rgba(27,45,69,0.24)] transition-all duration-300 sm:rounded-[34px] ${
                plannerStep === 'results' ? 'sm:max-w-[1480px]' : 'sm:max-w-7xl'
              } ${
                plannerVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'
              }`}
            >
              {plannerStep === 'results' ? (
                <div className="flex h-full min-h-0 flex-col bg-white">
                  <header className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <img src="/roady-logo.png" alt="Roady" className="h-10 w-auto object-contain" />
                        <button
                          type="button"
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold transition-colors hover:text-[#1B2D45]"
                          style={{ color: '#1B2D45' }}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                            <path d="m15 18-6-6 6-6" />
                          </svg>
                          Back
                        </button>
                      </div>

                      <div className="order-3 w-full text-center lg:order-none lg:w-auto">
                        <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: '#1B2D45' }}>
                          Roady picked your trip!
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={closePlanner}
                        className="rounded-full border px-5 py-2.5 text-sm font-extrabold transition-colors"
                        style={{
                          borderColor: 'rgba(216,90,48,0.24)',
                          backgroundColor: 'rgba(216,90,48,0.08)',
                          color: '#D85A30',
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-4">
                      <ResultStepRail />
                    </div>
                  </header>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8F6] px-4 py-4 sm:px-5">
                    <div className="mx-auto grid max-w-[1400px] gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(390px,0.95fr)]">
                      <div className="flex min-w-0 flex-col gap-4">
                        <div className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-[#DDE3EA] bg-white shadow-[0_16px_42px_rgba(27,45,69,0.08)] lg:min-h-[560px]">
                          {HAS_MAPBOX && startCoords && stops.length > 0 ? (
                            <RouteMap
                              stops={mapStops}
                              start={startCoords}
                              end={endCoords}
                              endLabel={tripDestinationLabel}
                              activeStop={activeStop}
                              onStopClick={setActiveStop}
                            />
                          ) : mapAnimation ? (
                            <Lottie
                              animationData={mapAnimation}
                              loop
                              style={{ width: '100%', height: '100%', minHeight: 430, transform: 'scale(1.04)' }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(55,138,221,0.16),transparent_28%),radial-gradient(circle_at_72%_72%,rgba(88,204,2,0.16),transparent_26%),linear-gradient(180deg,#ecf6ff_0%,#f8fbfe_100%)]" />
                          )}

                          <div className="absolute left-4 top-4 rounded-[18px] bg-white/95 p-4 shadow-[0_12px_30px_rgba(27,45,69,0.12)] backdrop-blur">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1B2D45]">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path d="M5 17h14l-1.5-7.5A2 2 0 0 0 15.54 8H8.46A2 2 0 0 0 6.5 9.5L5 17Z" />
                                    <path d="M7 17v2M17 17v2M8 13h8" />
                                  </svg>
                                </span>
                                <span className="text-sm font-extrabold" style={{ color: '#1B2D45' }}>{tripDaysLabel}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1B2D45]">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path d="M4 19 10 5l4 14 2-6 4 6" />
                                  </svg>
                                </span>
                                <span className="text-sm font-extrabold" style={{ color: '#1B2D45' }}>{formatMiles(tripMiles)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1B2D45]">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
                                    <circle cx="12" cy="10" r="2.5" />
                                  </svg>
                                </span>
                                <span className="text-sm font-extrabold" style={{ color: '#1B2D45' }}>{stops.length} stops</span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-extrabold shadow-[0_12px_30px_rgba(27,45,69,0.14)] transition-colors hover:text-[#D85A30]"
                            style={{ color: '#1B2D45' }}
                          >
                            View full route
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                              <path d="M14 3h7v7" />
                              <path d="M10 14 21 3" />
                              <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                            </svg>
                          </a>
                        </div>

                        <RouteAtGlance
                          startLabel={startInput}
                          stops={stops}
                          selectedHotel={selectedHotel}
                          fallbackDestination={routeDestination}
                          activeStop={activeStop}
                          onStopClick={setActiveStop}
                        />
                      </div>

                      <aside className="flex min-h-0 flex-col rounded-[28px] border border-[#DDE3EA] bg-white p-4 shadow-[0_16px_42px_rgba(27,45,69,0.06)] sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[20px] bg-[#EFFFF4]">
                            <img src="/roady.png" alt="" className="h-full w-full object-cover object-top" />
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                              Pick your stay
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {visibleHotels.length > 0
                                ? `We found ${visibleHotels.length} great option${visibleHotels.length === 1 ? '' : 's'} for your final stop.`
                                : 'Roady kept the route ready while you choose where to stay.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                          {prefs.hotelPreference !== 'none' && visibleHotels.length > 0 ? (
                            visibleHotels.map((hotel, index) => (
                              <ResultStayCard
                                key={`${hotel.name}-${hotel.city}-${index}`}
                                hotel={hotel}
                                selected={selectedHotelIndex === index}
                                preferenceLabels={[previewHotel, ...previewInterests].filter(Boolean)}
                                onSelect={() => {
                                  setSelectedHotelIndex(index);
                                  setHotelCarouselIndex(index);
                                }}
                              />
                            ))
                          ) : (
                            <div className="rounded-[22px] border border-dashed border-gray-200 bg-[#FAFAF9] px-4 py-5 text-sm leading-relaxed text-gray-500">
                              {prefs.hotelPreference === 'none'
                                ? 'You chose to sort accommodation separately, so Roady kept the stay step optional.'
                                : 'Roady is still lining up hotel matches for this destination.'}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 rounded-[18px] bg-[#FAFAF9] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(216,90,48,0.1)] text-lg">
                                ✨
                              </span>
                              <div>
                                <p className="text-sm font-extrabold" style={{ color: '#1B2D45' }}>
                                  Why these stays?
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                  Handpicked based on your preferences: {[previewHotel, ...previewInterests].filter(Boolean).slice(0, 4).join(', ') || 'route fit'}.
                                </p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 flex-shrink-0 text-[#1B2D45]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </div>

                        {(plannerError || saveMessage || shareMessage) && (
                          <div
                            className="mt-4 rounded-[18px] px-4 py-3 text-sm font-semibold"
                            style={{
                              backgroundColor: 'rgba(88,204,2,0.1)',
                              color: '#46a302',
                            }}
                          >
                            {plannerError || saveMessage || shareMessage}
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-[0.7fr_1.3fr] gap-3">
                          <button
                            type="button"
                            onClick={handleBack}
                            className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold transition-colors hover:text-[#1B2D45]"
                            style={{ color: '#1B2D45' }}
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlannerStep('save')}
                            disabled={!canProceed('results')}
                            className="inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                            style={{ backgroundColor: '#FF4E18' }}
                          >
                            Save stay & continue
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                              <path d="M5 12h14" />
                              <path d="m13 6 6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-3 text-center text-xs font-semibold text-gray-400">
                          You can change this later
                        </p>
                      </aside>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="flex h-full min-h-0 flex-col lg:flex-row">
                <aside className="w-full min-h-0 border-b border-gray-200 bg-white lg:h-full lg:w-[430px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 sm:px-8">
                      <img src="/roady-logo.png" alt="Roady" style={{ height: 38, width: 'auto' }} />
                      <button
                        type="button"
                        onClick={closePlanner}
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                        style={{
                          borderColor: 'rgba(216,90,48,0.28)',
                          backgroundColor: 'rgba(216,90,48,0.08)',
                          color: '#D85A30',
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <div className="px-6 pb-5 sm:px-8">
                      <div className="flex gap-1.5 mb-3">
                        {progressSteps.map((step, index) => (
                          <div
                            key={`${step}-${index}`}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor:
                                plannerStep === 'saved' || index <= plannerIndex ? '#58CC02' : '#E5E7EB',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-bold tracking-[0.14em]" style={{ color: '#58CC02' }}>
                        {plannerStep === 'saved'
                          ? 'TRIP SAVED'
                          : plannerStep === 'generating'
                            ? 'BUILDING YOUR TRIP'
                            : `STEP ${plannerIndex + 1} OF ${progressSteps.length} · ${currentPlannerMeta.eyebrow.toUpperCase()}`}
                      </p>
                    </div>

                    <div className="px-6 sm:px-8">
                      <h2 className="text-3xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                        {currentPlannerMeta.title}
                      </h2>
                      <p className="mt-3 text-base leading-relaxed text-gray-400">
                        {currentPlannerMeta.description}
                      </p>
                    </div>

                    <div className="mt-8 min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-8">
                      {plannerStep === 'start' && (
                        <div ref={suggestionRef}>
                          <div className="rounded-[26px] border border-gray-200 bg-[#FAFAF9] p-4">
                            <label
                              htmlFor="planner-start"
                              className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400"
                            >
                              Starting point
                            </label>
                            <input
                              id="planner-start"
                              value={startInput}
                              onChange={(event) => {
                                resetSuggestedTrip();
                                setStartInput(event.target.value);
                              }}
                              placeholder="Where are you starting from?"
                              className="mt-3 w-full border-0 bg-transparent px-0 text-2xl font-extrabold text-[#1B2D45] outline-none placeholder:text-gray-300"
                              autoComplete="off"
                            />
                          </div>

                          {startSuggestions.length > 0 && (
                            <div className="mt-3 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg">
                              {startSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => void applyStartSelection(suggestion)}
                                  className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-600 transition-colors last:border-b-0 hover:bg-gray-50 hover:text-[#1B2D45]"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => void detectCurrentLocation(true)}
                            className="mt-5 flex w-full items-center justify-between rounded-[22px] border border-gray-200 bg-white px-4 py-4 text-left transition-colors hover:border-[#58CC02]"
                          >
                            <div>
                              <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>
                                Use my location
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                Autofill your starting point from the device you are on.
                              </p>
                            </div>
                            <span className="text-sm font-bold" style={{ color: '#58CC02' }}>
                              {detectingLocation ? 'Locating...' : 'Use'}
                            </span>
                          </button>

                          <div className="mt-6">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              Popular starts
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3">
                              {POPULAR_STARTS.map((start) => (
                                <button
                                  key={start}
                                  type="button"
                                  onClick={() => void applyStartSelection(start)}
                                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-[#1B2D45] hover:text-[#1B2D45]"
                                >
                                  {start}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {plannerStep === 'group' && (
                        <div className="space-y-3">
                          {TRAVEL_GROUPS.map((group) => (
                            <SelectionCard
                              key={group.id}
                              item={group}
                              selected={prefs.travelGroup === group.id}
                              onClick={() => setTravelGroup(group.id)}
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'kids' && (
                        <div className="space-y-3">
                          {KIDS_AGES.map((age) => (
                            <SelectionCard
                              key={age.id}
                              item={age}
                              selected={prefs.kidsAges.includes(age.id)}
                              onClick={() => toggleKidsAge(age.id)}
                              multi
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'distance' && (
                        <div className="space-y-3">
                          {DISTANCE_OPTIONS.map((option) => (
                            <SelectionCard
                              key={option.id}
                              item={option}
                              selected={prefs.distancePreference === option.id}
                              onClick={() => setDistancePreference(option.id)}
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'interests' && (
                        <div className="space-y-8">
                          {INTEREST_GROUPS.map((group) => (
                            <div key={group.category}>
                              <p className="text-xs font-bold tracking-[0.14em] text-gray-400 mb-3">{group.category}</p>
                              <div className="flex flex-wrap gap-2.5">
                                {group.items.map((item) => (
                                  <InterestChip
                                    key={item.id}
                                    emoji={item.emoji}
                                    label={item.label}
                                    selected={prefs.interests.includes(item.id)}
                                    onClick={() => toggleInterest(item.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {plannerStep === 'hotelBudget' && (
                        <div className="space-y-3">
                          {HOTEL_BUDGETS.map((hotel) => (
                            <SelectionCard
                              key={hotel.id}
                              item={hotel}
                              selected={prefs.hotelPreference === hotel.id}
                              onClick={() => setHotelPreference(hotel.id)}
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'hotelDetails' && (
                        <div className="space-y-10">
                          <div>
                            <p className="text-[15px] font-bold mb-5" style={{ color: '#1B2D45' }}>
                              How many guests?
                            </p>
                            <div className="flex gap-3 flex-wrap">
                              {HOTEL_GUEST_OPTIONS.map((value) => (
                                <NumberPill
                                  key={value}
                                  value={value}
                                  selected={prefs.hotelGuests === value}
                                  onClick={() => {
                                    resetSuggestedTrip();
                                    setPrefs((currentPrefs) => ({ ...currentPrefs, hotelGuests: value }));
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[15px] font-bold mb-5" style={{ color: '#1B2D45' }}>
                              Check-in date
                            </p>
                            <div className="relative">
                              <input
                                type="date"
                                value={prefs.hotelCheckin}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(event) => {
                                  resetSuggestedTrip();
                                  setPrefs((currentPrefs) => ({ ...currentPrefs, hotelCheckin: event.target.value }));
                                }}
                                className="w-full rounded-[28px] border-2 bg-white px-8 py-6 text-2xl font-extrabold outline-none transition-all"
                                style={{
                                  borderColor: prefs.hotelCheckin ? '#1B2D45' : '#E5E7EB',
                                  color: '#1B2D45',
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <p className="text-[15px] font-bold mb-5" style={{ color: '#1B2D45' }}>
                              How many nights?
                            </p>
                            <div className="flex gap-3 flex-wrap">
                              {HOTEL_NIGHT_OPTIONS.map((value) => (
                                <NumberPill
                                  key={value}
                                  value={value}
                                  selected={prefs.hotelNights === value}
                                  onClick={() => {
                                    resetSuggestedTrip();
                                    setPrefs((currentPrefs) => ({ ...currentPrefs, hotelNights: value }));
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {plannerStep === 'enroute' && (
                        <div className="space-y-3">
                          {ENROUTE_COUNTS.map((count) => (
                            <SelectionCard
                              key={count.id}
                              item={count}
                              selected={prefs.numberOfEnrouteStops === count.id}
                              onClick={() => setEnrouteStops(count.id)}
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'spots' && (
                        <div className="space-y-3">
                          {DESTINATION_SPOT_COUNTS.map((count) => (
                            <SelectionCard
                              key={count.id}
                              item={count}
                              selected={prefs.numberOfStops === count.id}
                              onClick={() => setDestinationSpots(count.id)}
                            />
                          ))}
                        </div>
                      )}

                      {plannerStep === 'generating' && (
                        <div className="space-y-5">
                          <div className="rounded-[26px] bg-[#FAFAF9] p-5">
                            <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: '#D85A30' }}>
                              Roady is thinking
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full border-4 border-[#58CC02] border-t-transparent animate-spin" />
                              <div>
                                <p className="font-extrabold text-base" style={{ color: '#1B2D45' }}>
                                  Building a route from your answers
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                  This usually takes a few seconds.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[26px] border border-gray-200 bg-white p-5">
                            <p className="font-bold text-sm" style={{ color: '#1B2D45' }}>
                              What Roady knows so far
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {prefs.travelGroup && (
                                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(27,45,69,0.08)', color: '#1B2D45' }}>
                                  {GROUP_LABELS[prefs.travelGroup]}
                                </span>
                              )}
                              {previewDistance && (
                                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }}>
                                  {previewDistance}
                                </span>
                              )}
                              {previewInterests.map((label) => (
                                <span key={label} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(216,90,48,0.08)', color: '#D85A30' }}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {plannerStep === 'save' && (
                        <div className="space-y-4">
                          <div className="rounded-[26px] bg-[#FAFAF9] p-5">
                            <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: '#D85A30' }}>
                              Save or share
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                              Pick the easiest way to take this trip with you.
                            </p>
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <ShareActionButton
                              href={googleMapsUrl}
                              label="Open in Google Maps"
                              sublabel="Launch the full route."
                              kind="google"
                            />
                            <ShareActionButton
                              href={appleMapsUrl}
                              label="Open in Apple Maps"
                              sublabel="Send it to Apple Maps."
                              kind="apple"
                            />
                            <ShareActionButton
                              onClick={() => void handleCopyLink()}
                              label="Copy link"
                              sublabel="Copy a shareable trip link."
                              kind="copy"
                            />
                            <ShareActionButton
                              onClick={() => void handleSaveTrip(false)}
                              disabled={saving}
                              label={saving ? 'Saving...' : 'Save'}
                              sublabel={
                                user
                                  ? 'Keep it in your Roady account.'
                                  : 'Continue with Google and save it.'
                              }
                              kind="save"
                              primary
                            />
                          </div>
                        </div>
                      )}

                      {plannerStep === 'saved' && (
                        <div className="space-y-5">
                          <div className="rounded-[26px] border border-[#58CC02] bg-[rgba(88,204,2,0.08)] p-5">
                            <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: '#46a302' }}>
                              Trip saved
                            </p>
                            <p className="mt-2 text-2xl font-extrabold" style={{ color: '#1B2D45' }}>
                              Access it anytime and edit later.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-gray-500">
                              {savedTripId
                                ? 'Your planner is attached to your account and ready whenever you come back.'
                                : 'Your planner is saved and ready whenever you come back.'}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <a
                              href="/my-trips"
                              className="rounded-[22px] px-5 py-4 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: '#58CC02' }}
                            >
                              View my trips
                            </a>
                            <button
                              type="button"
                              onClick={() => setPlannerStep('results')}
                              className="rounded-[22px] border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-600 transition-colors hover:text-[#1B2D45]"
                            >
                              Edit this trip
                            </button>
                          </div>

                          <div className="grid gap-3">
                            {[
                              'Unlock premium routes',
                              'AI recommendations tuned to your travel style',
                              'Offline-friendly trip access for spotty signal days',
                            ].map((item) => (
                              <div
                                key={item}
                                className="rounded-[22px] border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-gray-600"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(plannerError || saveMessage || shareMessage) && (
                        <div
                          className="mt-5 rounded-[20px] px-4 py-3 text-sm font-semibold"
                          style={{
                            backgroundColor: 'rgba(88,204,2,0.1)',
                            color: '#46a302',
                          }}
                        >
                          {plannerError || saveMessage || shareMessage}
                        </div>
                      )}
                    </div>

                    {plannerStep !== 'generating' && plannerStep !== 'save' && plannerStep !== 'saved' && (
                      <div className="border-t border-gray-100 px-6 py-5 sm:px-8">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleBack}
                            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-[#1B2D45]"
                          >
                            Back
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleContinue()}
                            disabled={!canProceed(plannerStep)}
                            className="flex-1 rounded-full px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                            style={{ backgroundColor: '#58CC02' }}
                          >
                            {plannerStep === 'spots' ? 'Suggest my trip' : 'Next'}
                          </button>
                        </div>
                      </div>
                    )}

                    {plannerStep === 'save' && (
                      <div className="border-t border-gray-100 px-6 py-5 sm:px-8">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-[#1B2D45]"
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </div>
                </aside>

                <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#F7F9FB_0%,#EDF1F5_100%)]">
                  <div className="flex items-center justify-between gap-4 border-b border-white/70 px-6 py-5 sm:px-8">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: '#D85A30' }}>
                        Live trip preview
                      </p>
                      <p className="mt-1 text-lg font-extrabold" style={{ color: '#1B2D45' }}>
                        {startInput || 'Choose a starting point'} to {tripDestinationDisplay}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={{ backgroundColor: 'rgba(27,45,69,0.08)', color: '#1B2D45' }}
                      >
                        {tripDaysLabel}
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={{ backgroundColor: 'rgba(216,90,48,0.08)', color: '#D85A30' }}
                      >
                        {activeRouteOption?.icon ?? ROUTE_ICONS[seedRouteId]} {tripDestinationDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
                    <div className="grid min-h-full items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                      <div className="relative min-h-[320px] overflow-hidden rounded-[30px] border border-white/80 bg-white/75 shadow-[0_16px_50px_rgba(27,45,69,0.1)]">
                        {HAS_MAPBOX && startCoords && stops.length > 0 ? (
                          <RouteMap
                            stops={mapStops}
                            start={startCoords}
                            end={endCoords}
                            endLabel={tripDestinationLabel}
                            activeStop={activeStop}
                            onStopClick={setActiveStop}
                          />
                        ) : mapAnimation ? (
                          <Lottie
                            animationData={mapAnimation}
                            loop
                            style={{ width: '100%', height: '100%', transform: 'scale(1.04)' }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(55,138,221,0.16),transparent_28%),radial-gradient(circle_at_72%_72%,rgba(88,204,2,0.16),transparent_26%),linear-gradient(180deg,#ecf6ff_0%,#f8fbfe_100%)]" />
                        )}

                        {stops.length === 0 && (
                          <div className="absolute left-5 top-5 max-w-[280px] rounded-[22px] bg-white/94 px-4 py-3 shadow-md">
                            <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>
                              {plannerStep === 'start'
                                ? 'Choose a starting point to begin.'
                                : plannerStep === 'generating'
                                  ? 'Roady is stitching the trip together now.'
                                  : 'Answer the quick questions and the suggested trip will appear here.'}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-400">
                              The right side turns into a real trip card once Roady has enough context.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="rounded-[26px] border border-white/80 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            Trip card
                          </p>
                          <div className="mt-4">
                            <p className="text-sm font-bold" style={{ color: '#D85A30' }}>
                              {activeRouteOption?.icon ?? ROUTE_ICONS[seedRouteId]} Suggested route
                            </p>
                            <p className="mt-2 text-2xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
                              {routeName}
                            </p>
                            <p className="mt-2 text-sm text-gray-400">{tripDestinationDisplay}</p>
                            <p className="mt-4 text-sm leading-relaxed text-gray-500">{routeTagline}</p>
                          </div>
                          <div className="mt-5 grid grid-cols-3 gap-3">
                            <div className="rounded-[18px] bg-[#FAFAF9] p-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                Days
                              </p>
                              <p className="mt-2 text-sm font-extrabold" style={{ color: '#1B2D45' }}>
                                {tripDaysLabel}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-[#FAFAF9] p-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                Miles
                              </p>
                              <p className="mt-2 text-sm font-extrabold" style={{ color: '#1B2D45' }}>
                                {formatMiles(tripMiles)}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-[#FAFAF9] p-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                                Stops
                              </p>
                              <p className="mt-2 text-sm font-extrabold" style={{ color: '#1B2D45' }}>
                                {stops.length || '--'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[26px] border border-white/80 bg-white p-5 shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                            What you picked
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {prefs.travelGroup && (
                              <span
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: 'rgba(27,45,69,0.08)', color: '#1B2D45' }}
                              >
                                {GROUP_LABELS[prefs.travelGroup]}
                              </span>
                            )}
                            {previewDistance && (
                              <span
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: 'rgba(88,204,2,0.12)', color: '#46a302' }}
                              >
                                {previewDistance}
                              </span>
                            )}
                            {previewHotel && (
                              <span
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: 'rgba(216,90,48,0.08)', color: '#D85A30' }}
                              >
                                {previewHotel}
                              </span>
                            )}
                            {previewInterests.map((label) => (
                              <span
                                key={label}
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: 'rgba(55,138,221,0.1)', color: '#378ADD' }}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {selectedHotel && (
                          <div className="rounded-[26px] border border-white/80 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                              Hotel suggestion
                            </p>
                            <p className="mt-3 text-lg font-extrabold" style={{ color: '#1B2D45' }}>
                              {selectedHotel.name}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                              {selectedHotel.address || selectedHotel.city} · {selectedHotel.priceRange}
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-gray-500">
                              Roady is routing the trip to this stay as your final stop.
                            </p>
                            <a
                              href={getBookingSearchUrl(selectedHotel)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-4 inline-flex rounded-full border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:text-[#1B2D45]"
                            >
                              Open on Booking.com
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#58CC02' }} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
