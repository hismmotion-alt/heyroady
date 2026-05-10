'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  WHERE_TO_GO_DESTINATIONS,
  WHERE_TO_GO_TAGS,
  getWhereToGoDestination,
  type WhereToGoDestination,
  type WhereToGoTag,
} from '@/lib/where-to-go';

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
  hotelRooms: string;
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

type HomeDestinationFilter = 'all' | WhereToGoTag;

const WHERE_TO_GO_CATEGORY_CLASSES: Record<WhereToGoDestination['categoryColor'], string> = {
  coral: 'bg-[#EC501E] text-white',
  green: 'bg-[#35BA54] text-white',
  gold: 'bg-[#F5A400] text-white',
  purple: 'bg-[#7B5AC8] text-white',
};

type PersistedPlannerState = {
  step: PlannerStep;
  seedRouteId: PlannerRouteKey;
  destinationPreset?: WhereToGoDestination | null;
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

function HowItWorksIcon({ icon, className = 'roady-how-icon h-[89px] w-[89px]' }: { icon: string; className?: string }) {
  const iconSrcByType: Record<string, string> = {
    start: '/how-it-works-icon-1.svg',
    crew: '/how-it-works-icon-2.svg',
    vibe: '/how-it-works-icon-3.svg',
    suggests: '/how-it-works-icon-4.svg',
    save: '/how-it-works-icon-5.svg',
  };

  return (
    <img
      src={iconSrcByType[icon] ?? iconSrcByType.start}
      alt=""
      width={89}
      height={89}
      className={className}
      aria-hidden="true"
    />
  );
}

const PRICING_ASSETS = {
  hero: '/pricing/roady-pricing-hero.png',
  tag: '/pricing/tag-icon.svg',
  chipCircle: '/pricing/chip-icon-circle.svg',
  noCreditCard: '/pricing/no-credit-card-icon.svg',
  noHiddenFees: '/pricing/no-hidden-fees-icon.svg',
  tripsBuiltInSeconds: '/pricing/trips-built-in-seconds-icon.svg',
  ctaArrow: '/pricing/cta-arrow.svg',
  freePlanning: '/pricing/free-trip-planning-icon.svg',
  aiMood: '/pricing/ai-mood-icon.svg',
  premium: '/pricing/premium-icon.svg',
  divider: '/pricing/pricing-divider.svg',
};

const PRICING_CHIPS = [
  {
    label: 'No credit card',
    icon: PRICING_ASSETS.noCreditCard,
  },
  {
    label: 'No hidden fees',
    icon: PRICING_ASSETS.noHiddenFees,
  },
  {
    label: 'Trips built in seconds',
    icon: PRICING_ASSETS.tripsBuiltInSeconds,
  },
];

const PRICING_FEATURES = [
  {
    title: 'Free trip planning',
    body: 'Pick your vibe, route preferences, and travel style, then let Roady build a trip you can actually take.',
    icon: PRICING_ASSETS.freePlanning,
  },
  {
    title: 'AI that gets the mood',
    body: 'Roady turns your interests like wine, beaches, food, nature, or family-friendly stops into a tailored route.',
    icon: PRICING_ASSETS.aiMood,
  },
  {
    title: 'Premium coming next',
    body: 'Subscribers will unlock deeper customization, saved trip tools, offline access, and more advanced planning features.',
    icon: PRICING_ASSETS.premium,
  },
];

function PricingChip({
  label,
  icon,
  className = '',
}: {
  label: string;
  icon: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[58px] items-center gap-[15px] rounded-[29px] bg-[rgba(243,246,239,0.82)] py-[14px] pl-4 pr-5 ${className}`}
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <span className="relative h-[30px] w-[30px] shrink-0">
        <img src={PRICING_ASSETS.chipCircle} alt="" className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <img src={icon} alt="" className="absolute left-1.5 top-1.5 h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="whitespace-nowrap text-[17px] font-bold leading-6 text-[#061c55]">{label}</span>
    </span>
  );
}

function PricingSection({ onStartPlanning }: { onStartPlanning: () => void }) {
  return (
    <section id="pricing" className="scroll-mt-16 bg-white">
      <div className="relative mx-auto hidden h-[1022px] max-w-[1440px] min-[1220px]:block">
        <div className="absolute left-[51px] top-[61px] flex h-[26px] items-center gap-3">
          <img src={PRICING_ASSETS.tag} alt="" className="h-[26px] w-[26px]" aria-hidden="true" />
          <p
            className="text-[19px] font-bold leading-6 text-[#ff4e18]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            PRICING
          </p>
        </div>

        <h2
          className="absolute left-[48px] top-[118px] w-[532px] text-[76px] font-extrabold leading-[82px] text-[#061c55]"
          style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
        >
          <span className="block">
            Roady is <span className="text-[#fc4d19]">free</span>
          </span>
          <span className="block">
            to start - <span className="text-[#07905c]">$0</span>
          </span>
        </h2>

        <div
          className="absolute left-[48px] top-[294px] w-[612px] text-[20px] font-medium leading-[28px] text-[#8184a1]"
          style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
        >
          <p>Plan your California road trip in minutes with Roady&apos;s</p>
          <p>AI-powered planner. Start with the core features for free,</p>
          <p>then unlock more advanced planning tools when</p>
          <p>Premium is ready.</p>
        </div>

        <div className="absolute left-[48px] top-[422px] h-[58px] w-[661px]">
          <PricingChip label="No credit card" icon={PRICING_ASSETS.noCreditCard} className="absolute left-0 top-0 w-[198px]" />
          <PricingChip label="No hidden fees" icon={PRICING_ASSETS.noHiddenFees} className="absolute left-[191px] top-0 w-[210px]" />
          <PricingChip
            label="Trips built in seconds"
            icon={PRICING_ASSETS.tripsBuiltInSeconds}
            className="absolute left-[386px] top-0 w-[275px]"
          />
        </div>

        <button
          type="button"
          onClick={onStartPlanning}
          className="absolute left-[48px] top-[526px] h-[56px] w-[357px] rounded-[37px] bg-[#061c55] text-white shadow-[0_14px_14px_rgba(6,28,85,0.18)] transition-opacity hover:opacity-90"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          <span className="absolute left-2 top-3 w-[295px] text-center text-[21px] font-extrabold leading-[31px]">
            Start planning your trip
          </span>
          <img src={PRICING_ASSETS.ctaArrow} alt="" className="absolute left-[288px] top-5 h-[19px] w-6" aria-hidden="true" />
        </button>

        <img
          src={PRICING_ASSETS.hero}
          alt="Roady driving a green SUV along a coastal road"
          className="absolute left-[738px] top-[99px] h-[483px] w-[624px] rounded-[39px] object-cover"
        />

        <div className="absolute left-[48px] top-[657px] h-[183px] w-[1314px]">
          <div className="absolute left-0 top-0 h-[154px] w-[393px]">
            <img src={PRICING_ASSETS.freePlanning} alt="" className="absolute left-0 top-0 h-[86.98px] w-[86.98px]" aria-hidden="true" />
            <div className="absolute left-[113px] top-0 w-[280px]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              <h3 className="w-[260px] text-[23px] font-extrabold leading-[30px] text-[#061c55]">
                Free trip planning
              </h3>
              <div className="mt-2 w-[280px] text-[19px] font-medium leading-[29px] text-[#8184a1]">
                <p>Pick your vibe, route</p>
                <p>preferences, and travel</p>
                <p>style, then let Roady build</p>
                <p>a trip you can actually take.</p>
              </div>
            </div>
          </div>

          <img src={PRICING_ASSETS.divider} alt="" className="absolute left-[417px] top-0 h-[174.5px] w-[3px]" aria-hidden="true" />

          <div className="absolute left-[475px] top-0 h-[154px] w-[393px]">
            <img src={PRICING_ASSETS.aiMood} alt="" className="absolute left-0 top-0 h-[86.98px] w-[86.98px]" aria-hidden="true" />
            <div className="absolute left-[113px] top-0 w-[280px]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              <h3 className="w-[260px] text-[23px] font-extrabold leading-[30px] text-[#061c55]">
                AI that gets the mood
              </h3>
              <div className="mt-2 w-[280px] text-[19px] font-medium leading-[29px] text-[#8184a1]">
                <p>Roady turns your interests</p>
                <p>like wine, beaches, food,</p>
                <p>nature, or family-friendly</p>
                <p>stops into a tailored route.</p>
              </div>
            </div>
          </div>

          <img src={PRICING_ASSETS.divider} alt="" className="absolute left-[874px] top-0 h-[174.5px] w-[3px]" aria-hidden="true" />

          <div className="absolute left-[921px] top-0 h-[183px] w-[393px]">
            <img src={PRICING_ASSETS.premium} alt="" className="absolute left-0 top-0 h-[86.98px] w-[86.98px]" aria-hidden="true" />
            <div className="absolute left-[113px] top-0 w-[280px]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              <h3 className="w-[280px] text-[23px] font-extrabold leading-[30px] text-[#061c55]">
                Premium coming next
              </h3>
              <div className="mt-2 w-[280px] text-[19px] font-medium leading-[29px] text-[#8184a1]">
                <p>Subscribers will unlock deeper</p>
                <p>customization, saved trip</p>
                <p>tools,</p>
                <p>offline access, and more</p>
                <p>advanced planning features.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-14 min-[1220px]:hidden">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <img src={PRICING_ASSETS.tag} alt="" className="h-[26px] w-[26px]" aria-hidden="true" />
            <p
              className="text-[17px] font-bold leading-6 text-[#ff4e18]"
              style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
            >
              PRICING
            </p>
          </div>

          <h2
            className="mt-7 text-[40px] font-extrabold leading-[1.08] text-[#061c55] min-[380px]:text-[46px] sm:text-[58px]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            <span className="block">
              Roady is <span className="text-[#fc4d19]">free</span>
            </span>
            <span className="block">
              to start - <span className="text-[#07905c]">$0</span>
            </span>
          </h2>
          <p
            className="mt-5 text-[18px] font-medium leading-7 text-[#8184a1]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            Plan your California road trip in minutes with Roady&apos;s AI-powered planner. Start with the core
            features for free, then unlock more advanced planning tools when Premium is ready.
          </p>

          <img
            src={PRICING_ASSETS.hero}
            alt="Roady driving a green SUV along a coastal road"
            className="mt-8 aspect-[624/483] w-full rounded-[28px] object-cover"
          />

          <div className="mt-8 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap">
            {PRICING_CHIPS.map((chip) => (
              <PricingChip key={chip.label} label={chip.label} icon={chip.icon} className="h-[50px] gap-3 px-3 py-2" />
            ))}
          </div>

          <button
            type="button"
            onClick={onStartPlanning}
            className="mt-8 inline-flex h-[56px] w-full items-center justify-center gap-3 rounded-[37px] bg-[#061c55] px-6 text-[18px] font-extrabold text-white shadow-[0_14px_14px_rgba(6,28,85,0.18)] transition-opacity hover:opacity-90"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Start planning your trip
            <img src={PRICING_ASSETS.ctaArrow} alt="" className="h-[16px] w-[21px]" aria-hidden="true" />
          </button>

          <div className="mt-12 space-y-8">
            {PRICING_FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-5">
                <img src={feature.icon} alt="" className="h-[72px] w-[72px] shrink-0" aria-hidden="true" />
                <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  <h3 className="text-[22px] font-extrabold leading-[28px] text-[#061c55]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[17px] font-medium leading-7 text-[#8184a1]">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const DEFAULT_PREFS: PlannerPreferences = {
  travelGroup: '',
  kidsAges: [],
  distancePreference: '',
  interests: [],
  hotelPreference: '',
  hotelRooms: '1',
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

const HOTEL_NIGHT_OPTIONS = ['1', '2', '3', '4', '5', '6+'];

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

function HotelDetailIcon({
  kind,
  className = 'h-6 w-6',
}: {
  kind: 'calendar' | 'bed' | 'guests' | 'moon' | 'sparkles';
  className?: string;
}) {
  if (kind === 'calendar') {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
        <path d="M7 3v4M17 3v4M4 9h16" strokeLinecap="round" />
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 13h3M14 13h2M8 17h2M13 17h3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'bed') {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
        <path d="M4 11V6M20 18v-5a2 2 0 0 0-2-2H4v7M4 15h16M7 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'guests') {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15.5 14.5A5 5 0 0 1 20.5 19" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'moon') {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
        <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7.2 7.2 0 1 0 11.5 11.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="m8 3 1.6 4.4L14 9l-4.4 1.6L8 15l-1.6-4.4L2 9l4.4-1.6L8 3Z" strokeLinejoin="round" />
      <path d="m17 12 1 2.7 2.7 1-2.7 1-1 2.8-1-2.8-2.7-1 2.7-1 1-2.7Z" strokeLinejoin="round" />
    </svg>
  );
}

function HotelDetailStepper({
  label,
  icon,
  value,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
}: {
  label: string;
  icon: 'bed' | 'guests';
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#EFFFF4] text-[#13A85B]">
          <HotelDetailIcon kind={icon} />
        </span>
        <span className="text-base font-bold text-[#061C55] sm:text-lg">{label}</span>
      </div>

      <div className="grid h-11 w-[168px] grid-cols-3 overflow-hidden rounded-[16px] border border-[#DDE3EA] bg-white shadow-[0_8px_18px_rgba(27,45,69,0.04)] max-[520px]:w-[150px]">
        <button
          type="button"
          onClick={onDecrement}
          disabled={decrementDisabled}
          className="flex items-center justify-center border-r border-[#E3E7EF] text-2xl font-bold text-[#061C55] transition-colors hover:bg-[#F8FAFC] disabled:text-[#B8C1D0]"
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          -
        </button>
        <div className="flex items-center justify-center text-2xl font-extrabold text-[#061C55]">
          {value}
        </div>
        <button
          type="button"
          onClick={onIncrement}
          disabled={incrementDisabled}
          className="flex items-center justify-center border-l border-[#E3E7EF] text-2xl font-bold text-[#061C55] transition-colors hover:bg-[#F8FAFC] disabled:text-[#B8C1D0]"
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
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

function formatHotelCheckinDate(value: string) {
  if (!value) return 'Select check-in date';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Select check-in date';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getCountValue(value: string, fallback: number) {
  const count = Number.parseInt(value.replace('+', ''), 10);
  return Number.isNaN(count) ? fallback : count;
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

function buildQuestionSteps(prefs: PlannerPreferences, hasDestinationPreset = false): PlannerStep[] {
  const steps: PlannerStep[] = ['start', 'group'];
  if (!hasDestinationPreset && prefs.travelGroup === 'family-kids') steps.push('kids');
  if (hasDestinationPreset) {
    steps.push('hotelBudget');
    if (prefs.hotelPreference && prefs.hotelPreference !== 'none') steps.push('hotelDetails');
    steps.push('enroute', 'spots');
    return steps;
  }
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
  const searchParams = useSearchParams();
  const howFade = useFadeIn(0.08);
  const routesFade = useFadeIn(0.08);
  const faqFade = useFadeIn(0.08);

  const [mapAnimation, setMapAnimation] = useState<object | null>(null);
  const [heroAnimation, setHeroAnimation] = useState<object | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerVisible, setPlannerVisible] = useState(false);
  const [plannerStep, setPlannerStep] = useState<PlannerStep>('start');
  const [seedRouteId, setSeedRouteId] = useState<PlannerRouteKey>('pch');
  const [startInput, setStartInput] = useState('');
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PlannerPreferences>(DEFAULT_PREFS);
  const [destinationPreset, setDestinationPreset] = useState<WhereToGoDestination | null>(null);
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
  const [homeDestinationFilter, setHomeDestinationFilter] = useState<HomeDestinationFilter>('all');

  const suggestionRef = useRef<HTMLDivElement>(null);
  const hotelCheckinInputRef = useRef<HTMLInputElement>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveOnRestoreRef = useRef(false);

  const routeRegion = getStartRegion(startInput, startCoords);
  const fallbackRoute = PLANNER_ROUTE_DEFINITIONS[seedRouteId][routeRegion];
  const activeRouteOption = routeOptions[routeOptionIndex] ?? null;
  const routeDestination = activeRouteOption?.destination ?? destinationPreset?.name ?? fallbackRoute.destination;
  const routeName = tripData?.routeName ?? activeRouteOption?.name ?? fallbackRoute.routeName;
  const routeTagline = tripData?.tagline ?? activeRouteOption?.tagline ?? fallbackRoute.tagline;
  const routeSummary = tripData?.destinationDescription ?? destinationPreset?.description ?? fallbackRoute.summary;
  const questionSteps = buildQuestionSteps(prefs, Boolean(destinationPreset));
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
  const currentPlannerMeta =
    destinationPreset && plannerStep === 'generating'
      ? {
          ...PLANNER_META.generating,
          title: `Roady is building your ${destinationPreset.name} trip.`,
          description: 'Using your starting point, crew, hotel preference, and stop counts to shape the route.',
        }
      : destinationPreset && plannerStep === 'results'
        ? {
            ...PLANNER_META.results,
            title: `${destinationPreset.name} is ready.`,
            description: 'Review the route, browse stay picks, and save or open the trip.',
          }
        : PLANNER_META[plannerStep];
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
    fetch('/roady-hero.json')
      .then((response) => response.json())
      .then((data) => setHeroAnimation(data))
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
      setDestinationPreset(parsed.destinationPreset ?? null);
      setStartInput(parsed.startInput);
      setStartCoords(parsed.startCoords);
      setPrefs({ ...DEFAULT_PREFS, ...parsed.prefs });
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
    if (searchParams.get('plan') === '1') {
      openPlanner('pch');
      router.replace('/', { scroll: false });
      return;
    }

    const source = searchParams.get('source');
    const destinationSlug = searchParams.get('destination');
    if (source !== 'where-to-go' || !destinationSlug) return;

    const destination = getWhereToGoDestination(destinationSlug);
    if (!destination) return;

    openPlannerForDestination(destination);
    router.replace('/', { scroll: false });
    // This intentionally runs when the URL changes into the where-to-go launch state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

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
    setDestinationPreset(null);
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

  function openPlannerForDestination(destination: WhereToGoDestination) {
    setSeedRouteId(destination.fallbackRouteId);
    setDestinationPreset(destination);
    setPlannerStep('start');
    setPlannerOpen(true);
    setPlannerVisible(false);
    setStartInput('');
    setStartCoords(null);
    setStartSuggestions([]);
    setPrefs(DEFAULT_PREFS);
    setTripData(null);
    setRouteOptions([
      {
        id: destination.slug,
        name: `${destination.name} Road Trip`,
        tagline: destination.description,
        via: destination.region,
        destination: destination.name,
        icon: '📍',
        fallbackRouteId: destination.fallbackRouteId,
      },
    ]);
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

  function openHotelCheckinPicker() {
    const input = hotelCheckinInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall through to focus/click for browsers that reject showPicker in this layout.
      }
    }

    input.focus();
    input.click();
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
      destinationPreset,
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
        hotelRooms: prefs.hotelRooms,
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
          hotelRooms: prefs.hotelRooms,
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
      const fallbackDestination = destinationPreset?.name ?? fallbackVariant.destination;
      const fallbackSummary = destinationPreset?.description ?? fallbackVariant.summary;
      const fallbackHotelNames =
        prefs.hotelPreference === '$$$'
          ? ['Grand Hotel', 'Resort & Spa', 'Historic Suites', 'Coastal House']
          : prefs.hotelPreference === '$$'
            ? ['Inn & Suites', 'Plaza Hotel', 'Foundry Hotel', 'Harbor Hotel']
            : ['Motor Lodge', 'Roadside Inn', 'Stay & Suites', 'Sunset Inn'];
      const fallbackTrip: TripData = {
        routeName: option.name || fallbackVariant.routeName,
        tagline: option.tagline || fallbackVariant.tagline,
        totalMiles: estimateTripMiles(startCoords, fallbackStops, endPoint),
        stops: fallbackStops.map(stripPlannerStop),
        hotels:
          prefs.hotelPreference && prefs.hotelPreference !== 'none'
            ? fallbackHotelNames.map((suffix) => ({
                name: `${fallbackDestination} ${suffix}`,
                city: fallbackDestination,
                priceRange: prefs.hotelPreference as '$' | '$$' | '$$$',
                bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                  `${fallbackDestination} ${suffix} ${fallbackDestination}`
                )}&dest_type=hotel&is_hotel=1&lang=en-us`,
              }))
            : undefined,
        completed: true,
        destinationDescription: fallbackSummary,
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
      setMapEndCoords(endPoint);
      setPlannerError('Roady is showing a curated route while live suggestions warm up.');
      setPlannerStep('results');
    }
  }

  async function generateSuggestedTrip(excludeDestinations: string[] = []) {
    if (!startInput.trim()) {
      setPlannerStep('start');
      return;
    }

    if (destinationPreset) {
      const option: SuggestedRouteOption = routeOptions[0] ?? {
        id: destinationPreset.slug,
        name: `${destinationPreset.name} Road Trip`,
        tagline: destinationPreset.description,
        via: destinationPreset.region,
        destination: destinationPreset.name,
        icon: '📍',
        fallbackRouteId: destinationPreset.fallbackRouteId,
      };
      await loadTripForRoute(option, [option], 0);
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

    if (destinationPreset) {
      const option = routeOptions[0];
      if (option) {
        await loadTripForRoute(option, [option], 0);
      }
      return;
    }

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
      hotelRooms: hotelPreference === 'none' ? '1' : currentPrefs.hotelRooms || '1',
      hotelGuests: hotelPreference === 'none' ? '' : currentPrefs.hotelGuests || '2',
      hotelCheckin: hotelPreference === 'none' ? '' : currentPrefs.hotelCheckin,
      hotelNights: hotelPreference === 'none' ? '' : currentPrefs.hotelNights,
    }));
  }

  function setHotelRoomsFromDelta(delta: number) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => {
      const currentRooms = getCountValue(currentPrefs.hotelRooms, 1);
      const nextRooms = Math.max(1, Math.min(4, currentRooms + delta));
      return { ...currentPrefs, hotelRooms: String(nextRooms) };
    });
  }

  function setHotelGuestsFromDelta(delta: number) {
    resetSuggestedTrip();
    setPrefs((currentPrefs) => {
      const currentGuests = getCountValue(currentPrefs.hotelGuests, 2);
      const nextGuests = Math.max(1, Math.min(6, currentGuests + delta));
      return { ...currentPrefs, hotelGuests: nextGuests >= 6 ? '6+' : String(nextGuests) };
    });
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
        return Boolean(prefs.hotelRooms && prefs.hotelGuests && prefs.hotelCheckin && prefs.hotelNights);
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
  const mobileWhereToGoDestinations = (
    homeDestinationFilter === 'all'
      ? WHERE_TO_GO_DESTINATIONS
      : WHERE_TO_GO_DESTINATIONS.filter((destination) => destination.tags.includes(homeDestinationFilter))
  ).slice(0, 3);

  const navLinks = [
    { label: 'Where to go', href: '/where-to-go' },
    { label: 'Blog', href: '/blog' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
  ];
  const heroAvatarImages = [
    '/hero-avatar-1.jpg',
    '/hero-avatar-2.jpg',
    '/hero-avatar-3.jpg',
    '/hero-avatar-4.jpg',
  ];
  const howItWorksSteps = [
    {
      title: 'Starting point',
      body: 'Set where the drive begins',
      icon: 'start',
      left: 95.7617,
    },
    {
      title: 'Travel crew',
      body: "Tell Roady who's coming along",
      icon: 'crew',
      left: 384.084,
    },
    {
      title: 'Trip vibe',
      body: 'Pick interests and hotel style',
      icon: 'vibe',
      left: 672.4063,
    },
    {
      title: 'Roady suggests',
      body: 'Get a custom route built by AI',
      icon: 'suggests',
      left: 960.7285,
    },
    {
      title: 'Save or export',
      body: 'Keep it, share it, or open it in Maps',
      icon: 'save',
      left: 1249.0508,
    },
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
      />

      <section className="relative mt-16 overflow-hidden bg-white min-[1220px]:h-[844px]">
        <div className="relative mx-auto hidden h-full max-w-[1440px] min-[1220px]:block">
          <div
            className="absolute flex h-[40.14px] w-[338.78px] items-center rounded-[20px]"
            style={{
              left: 49,
              top: 144,
              backgroundColor: '#fff0e9',
              color: '#ec501e',
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
            }}
          >
            <svg className="absolute left-[21.09px] top-[11.37px] h-[16.43px] w-[17.21px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.75l2.3 6.05 6.45.32-5.02 4.08 1.7 6.23L12 15.92 6.57 19.43l1.7-6.23-5.02-4.08 6.45-.32z" />
            </svg>
            <span className="absolute left-[43.09px] top-[11.37px] h-[18px] w-[278px] text-[15px] font-medium leading-[normal]">
              The easiest way to plan epic road trips
            </span>
          </div>

          <h1
            className="absolute whitespace-nowrap text-[80px] font-bold leading-[90px]"
            style={{
              left: 49,
              top: 201.37,
              fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif',
            }}
          >
            <span className="block text-[#141046]">Let Roady plan</span>
            <span className="block text-[#141046]">your next</span>
            <span className="block text-[#ec501e]">adventure</span>
          </h1>

          <p
            className="absolute w-[471px] text-[19px] font-medium leading-[normal] text-[#818395]"
            style={{
              left: 49,
              top: 476.37,
              fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif',
            }}
          >
            Tell Roady what you love, and get a personalized road trip in less than 30 seconds
          </p>

          <button
            onClick={() => openPlanner('pch')}
            className="roady-cta-shadow absolute h-[58.15px] w-[301.5px] rounded-[18px] bg-[#25AB45] text-left text-[17px] font-medium leading-[normal] text-white transition-opacity hover:opacity-90"
            style={{
              left: 49,
              top: 553.82,
              fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif',
            }}
          >
            <span className="absolute left-[25.19px] top-[16.55px] whitespace-nowrap">
              Start planning with Roady
            </span>
            <svg className="absolute left-[258.19px] top-[23.55px] h-[11.79px] w-[15.73px]" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 16 12">
              <path d="M1 6h13" strokeLinecap="round" />
              <path d="m9.5 1 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute flex -space-x-[10px]" style={{ left: 49, top: 635.84 }}>
            {heroAvatarImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-[52px] w-[52px] rounded-full border border-[#141046]/70 object-cover"
                style={{ zIndex: heroAvatarImages.length - index }}
              />
            ))}
          </div>
          <div
            className="absolute whitespace-nowrap text-[17px] leading-[normal]"
            style={{
              left: 252,
              top: 638.37,
              fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif',
            }}
          >
            <p className="mb-0 font-bold text-[#141046]">Join 20,000+</p>
            <p className="font-medium text-[#818395]">happy road trippers</p>
          </div>
          <img
            src="/figma-hero-underline.svg"
            alt=""
            className="absolute h-[11px] w-[78px]"
            style={{ left: 251.78, top: 693.29 }}
          />

          <div
            role="img"
            aria-label="Roady planning a trip"
            className="absolute h-[546px] w-[748px]"
            style={{ left: 643.92, top: 148.06 }}
          >
            {heroAnimation ? (
              <Lottie
                animationData={heroAnimation}
                loop
                className="h-full w-full"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <img
                src="/figma-hero-art.svg"
                alt=""
                className="h-full w-full"
              />
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-10 min-[1220px]:hidden">
          <h1
            className="text-[48px] font-bold leading-[1.04] text-[#141046] sm:text-[64px]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            Let Roady plan your next <span className="text-[#ec501e]">adventure</span>
          </h1>

          <p
            className="mt-5 max-w-[330px] text-[19px] font-medium leading-[normal] text-[#818395] sm:max-w-xl"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            Tell Roady what you love, and get a personalized road trip in less than 30 seconds
          </p>

          <button
            onClick={() => openPlanner('pch')}
            className="roady-cta-shadow mt-8 inline-flex h-[58px] w-full max-w-[330px] items-center justify-center gap-5 rounded-[18px] bg-[#25AB45] px-7 text-[17px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            Start planning with Roady
            <svg className="h-3 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 16 12">
              <path d="M1 6h13" strokeLinecap="round" />
              <path d="m9.5 1 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="relative mt-8 h-[360px] overflow-hidden sm:h-[430px]">
            <div
              role="img"
              aria-label="Roady planning a trip"
              className="absolute left-1/2 top-0 h-[360px] w-[493px] max-w-none -translate-x-1/2 sm:h-[430px] sm:w-[589px]"
            >
              {heroAnimation ? (
                <Lottie
                  animationData={heroAnimation}
                  loop
                  className="h-full w-full"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <img
                  src="/figma-hero-art.svg"
                  alt=""
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="px-6 py-20 max-[1219px]:hidden" style={{ backgroundColor: '#ffffff' }}>
        <div
          ref={routesFade.ref}
          className="mx-auto max-w-[1440px] transition-all duration-700"
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

      <section className="bg-white px-6 py-12 min-[1220px]:hidden">
        <div className="mx-auto max-w-md">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#EC501E]">
                Roady picks
              </p>
              <h2
                className="mt-2 text-[34px] font-bold leading-[1.08] text-[#141046]"
                style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
              >
                Where to go
              </h2>
            </div>
            <a href="/where-to-go" className="shrink-0 text-sm font-extrabold text-[#25AB45]">
              View all
            </a>
          </div>

          <div className="-mx-6 mt-7 flex gap-3 overflow-x-auto px-6 pb-2">
            <button
              type="button"
              onClick={() => setHomeDestinationFilter('all')}
              className={`shrink-0 rounded-full border px-5 py-3 text-sm font-extrabold transition-colors ${
                homeDestinationFilter === 'all'
                  ? 'border-[#25AB45] bg-[#25AB45] text-white'
                  : 'border-[#DDE1EA] bg-white text-[#141046]'
              }`}
            >
              All
            </button>
            {WHERE_TO_GO_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setHomeDestinationFilter(tag.id)}
                className={`shrink-0 rounded-full border px-5 py-3 text-sm font-extrabold transition-colors ${
                  homeDestinationFilter === tag.id
                    ? 'border-[#25AB45] bg-[#25AB45] text-white'
                    : 'border-[#DDE1EA] bg-white text-[#141046]'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {mobileWhereToGoDestinations.map((destination) => (
              <button
                key={destination.id}
                type="button"
                onClick={() => openPlannerForDestination(destination)}
                className="group block w-full overflow-hidden rounded-[26px] border border-[#E6E8EF] bg-white text-left shadow-[0_14px_34px_rgba(20,16,70,0.08)] transition-all duration-300 active:scale-[0.99]"
              >
                <div className="relative h-[178px] overflow-hidden">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm ${WHERE_TO_GO_CATEGORY_CLASSES[destination.categoryColor]}`}
                  >
                    {destination.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-[24px] font-extrabold leading-tight text-[#141046]">
                    {destination.name}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#6F7285]">
                    <svg className="h-4 w-4 text-[#141046]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {destination.region}
                  </p>
                  <p className="mt-3 text-[15px] font-medium leading-7 text-[#6F7285]">
                    {destination.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <span className="text-sm font-extrabold text-[#EC501E]">
                      {destination.stopCount} stops
                    </span>
                    <span className="rounded-full border border-[#DDE1EA] px-5 py-2.5 text-sm font-extrabold text-[#141046]">
                      Plan this trip
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 pb-16 pt-6 min-[1220px]:hidden">
        <div className="mx-auto max-w-md rounded-[30px] bg-[#141046] px-6 py-8 text-center shadow-[0_20px_52px_rgba(20,16,70,0.18)]">
          <h2
            className="text-[30px] font-bold leading-[1.12] text-white"
            style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
          >
            Ready to plan your trip?
          </h2>
          <p className="mx-auto mt-3 max-w-[280px] text-sm font-medium leading-6 text-[#D9D5F3]">
            Tell Roady where you are starting, and your California route appears in seconds.
          </p>
          <button
            type="button"
            onClick={() => openPlanner('pch')}
            className="roady-cta-shadow mt-6 inline-flex h-[56px] w-full max-w-[260px] items-center justify-center gap-3 rounded-[18px] bg-[#25AB45] text-[16px] font-extrabold text-white transition-opacity hover:opacity-90"
          >
            Start planning
            <svg className="h-3 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 16 12">
              <path d="M1 6h13" strokeLinecap="round" />
              <path d="m9.5 1 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      <PricingSection onStartPlanning={() => openPlanner('pch')} />

      <section id="how-it-works" className="relative scroll-mt-16 overflow-hidden bg-white">
        <div
          ref={howFade.ref}
          className="mx-auto max-w-[1440px] transition-all duration-700"
          style={{
            opacity: howFade.visible ? 1 : 0,
            transform: howFade.visible ? 'none' : 'translateY(24px)',
          }}
        >
          <div className="relative hidden h-[500px] min-[1220px]:block">
            <h2
              className="absolute left-1/2 top-[56px] w-[360px] -translate-x-1/2 text-center text-[40px] font-bold leading-[42px] text-[#141046]"
              style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
            >
              How Roady works
            </h2>

            {howItWorksSteps.slice(0, -1).map((step, index) => {
              const nextStep = howItWorksSteps[index + 1];

              return (
                <svg
                  key={`${step.title}-${nextStep.title}`}
                  className="absolute top-[202px] h-[28px] text-black"
                  style={{
                    left: `${step.left + 146}px`,
                    width: `${nextStep.left - step.left - 203}px`,
                  }}
                  viewBox="0 0 140 28"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 14H129"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="9 10"
                  />
                  <path
                    d="M124 7L137 14L124 21"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            })}

            {howItWorksSteps.map((step) => {
              const textLeft = step.left + 44.16 - 105;

              return (
                <div key={step.title}>
                  <div className="group absolute top-[172px] h-[89px] w-[89px]" style={{ left: `${step.left}px` }}>
                    <HowItWorksIcon icon={step.icon} />
                  </div>
                  <div
                    className="absolute top-[289px] w-[210px] text-center"
                    style={{
                      left: `${textLeft}px`,
                      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    }}
                  >
                    <p className="text-[18px] font-extrabold leading-[22px] text-[#141046]">{step.title}</p>
                    <p className="mx-auto mt-[7px] max-w-[190px] text-[14px] font-medium leading-[20px] text-[#818395]">
                      {step.body}
                    </p>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => openPlanner('pch')}
              className="roady-cta-shadow absolute left-[605px] top-[392px] inline-flex h-[58px] w-[229px] items-center justify-center gap-[10px] rounded-[13px] bg-[#25AB45] text-[15px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
            >
              Generate my trip
              <svg className="h-[16px] w-[16px]" fill="none" viewBox="0 0 24 24">
                <path
                  d="m8 3 1.5 4L13 8.5 9.5 10 8 14l-1.5-4L3 8.5 6.5 7 8 3Z"
                  fill="currentColor"
                />
                <path
                  d="m17 11 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <p
              className="absolute left-[636px] top-[462px] w-[169px] text-center text-[10px] font-medium leading-[12px] text-[#818395]"
              style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
            >
              Takes less than 30 seconds
            </p>
          </div>

          <div className="px-6 py-12 min-[1220px]:hidden">
            <h2
              className="text-[34px] font-bold leading-[1.12] text-[#141046] sm:text-[40px]"
              style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
            >
              How Roady works
            </h2>

            <div className="mt-8 space-y-5">
              {howItWorksSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-center gap-4 rounded-[24px] border border-[#E7EAF2] bg-white p-4 shadow-[0_12px_30px_rgba(20,16,70,0.06)]"
                >
                  <div className="group h-[58px] w-[58px] shrink-0">
                    <HowItWorksIcon icon={step.icon} className="roady-how-icon h-[58px] w-[58px]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#EC501E]">
                      Step {index + 1}
                    </p>
                    <p
                      className="mt-1 text-[18px] font-extrabold leading-[22px] text-[#141046]"
                      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                    >
                      {step.title}
                    </p>
                    <p
                      className="mt-1 text-[14px] font-medium leading-[20px] text-[#818395]"
                      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                    >
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 max-[1219px]:hidden" style={{ backgroundColor: '#ffffff' }} id="faq">
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
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 sm:flex-row">
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
                <aside
                  className={`w-full min-h-0 border-b border-gray-200 bg-white lg:h-full lg:flex-shrink-0 lg:border-b-0 lg:border-r ${
                    plannerStep === 'hotelDetails' ? 'lg:w-[600px]' : 'lg:w-[430px]'
                  }`}
                >
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
                      <h2
                        className={`${plannerStep === 'hotelDetails' ? 'text-2xl' : 'text-3xl'} font-extrabold leading-tight`}
                        style={{ color: '#1B2D45' }}
                      >
                        {currentPlannerMeta.title}
                      </h2>
                      <p
                        className={`${plannerStep === 'hotelDetails' ? 'mt-2 text-sm leading-snug' : 'mt-3 text-base leading-relaxed'} text-gray-400`}
                      >
                        {currentPlannerMeta.description}
                      </p>
                    </div>

                    <div
                      className={`${plannerStep === 'hotelDetails' ? 'mt-4 pb-4' : 'mt-8 pb-8'} min-h-0 flex-1 overflow-y-auto px-6 sm:px-8`}
                    >
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
                        <div className="rounded-[24px] border border-[#E6EAF1] bg-white p-4 shadow-[0_14px_36px_rgba(27,45,69,0.06)] sm:p-5">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFFFF4] text-[#13A85B]">
                                <HotelDetailIcon kind="calendar" />
                              </span>
                              <p className="text-lg font-extrabold text-[#061C55] sm:text-xl">
                                Check-in date
                              </p>
                            </div>

                            <div
                              role="button"
                              tabIndex={0}
                              onClick={openHotelCheckinPicker}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  openHotelCheckinPicker();
                                }
                              }}
                              className="relative mt-3 flex min-h-[54px] w-full cursor-pointer items-center rounded-[16px] border border-[#DDE3EA] bg-white px-4 text-left shadow-[0_8px_18px_rgba(27,45,69,0.04)]"
                            >
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-[#061C55]">
                                <HotelDetailIcon kind="calendar" className="h-5 w-5" />
                              </span>
                              <span className="ml-3 min-w-0 flex-1 text-base font-bold text-[#061C55] sm:text-lg">
                                {formatHotelCheckinDate(prefs.hotelCheckin)}
                              </span>
                              <svg className="h-5 w-5 flex-shrink-0 text-[#061C55]" fill="none" stroke="currentColor" strokeWidth="2.7" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <input
                                ref={hotelCheckinInputRef}
                                type="date"
                                value={prefs.hotelCheckin}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(event) => {
                                  resetSuggestedTrip();
                                  setPrefs((currentPrefs) => ({ ...currentPrefs, hotelCheckin: event.target.value }));
                                }}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                aria-label="Check-in date"
                              />
                            </div>

                            <p className="mt-2 text-sm font-medium leading-snug text-[#71809A]">
                              We'll search for hotels with availability on this date.
                            </p>
                          </div>

                          <div className="my-4 h-px bg-[#E6EAF1]" />

                          <div>
                            <p className="text-lg font-extrabold text-[#061C55] sm:text-xl">
                              Rooms & guests
                            </p>

                            <div className="mt-4 space-y-3">
                              <HotelDetailStepper
                                label="Rooms"
                                icon="bed"
                                value={prefs.hotelRooms || '1'}
                                onDecrement={() => setHotelRoomsFromDelta(-1)}
                                onIncrement={() => setHotelRoomsFromDelta(1)}
                                decrementDisabled={getCountValue(prefs.hotelRooms, 1) <= 1}
                                incrementDisabled={getCountValue(prefs.hotelRooms, 1) >= 4}
                              />

                              <HotelDetailStepper
                                label="Guests"
                                icon="guests"
                                value={prefs.hotelGuests || '2'}
                                onDecrement={() => setHotelGuestsFromDelta(-1)}
                                onIncrement={() => setHotelGuestsFromDelta(1)}
                                decrementDisabled={getCountValue(prefs.hotelGuests, 2) <= 1}
                                incrementDisabled={getCountValue(prefs.hotelGuests, 2) >= 6}
                              />
                            </div>

                            <p className="mt-3 text-sm font-medium leading-snug text-[#71809A]">
                              Including adults and children.
                            </p>
                          </div>

                          <div className="my-4 h-px bg-[#E6EAF1]" />

                          <div>
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFFFF4] text-[#13A85B]">
                                <HotelDetailIcon kind="moon" />
                              </span>
                              <div>
                                <p className="text-lg font-extrabold text-[#061C55] sm:text-xl">Nights</p>
                                <p className="mt-0.5 text-sm font-medium text-[#71809A]">
                                  How long will you be staying?
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {HOTEL_NIGHT_OPTIONS.map((value) => {
                                const selected = prefs.hotelNights === value;
                                const label = `${value} night${value === '1' ? '' : 's'}`;

                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      resetSuggestedTrip();
                                      setPrefs((currentPrefs) => ({ ...currentPrefs, hotelNights: value }));
                                    }}
                                    className="h-12 rounded-[14px] border text-sm font-bold transition-all sm:text-base"
                                    style={{
                                      borderColor: selected ? '#13A85B' : '#DDE3EA',
                                      backgroundColor: selected ? '#F3FFF6' : '#FFFFFF',
                                      color: selected ? '#13A85B' : '#061C55',
                                      boxShadow: selected ? '0 10px 24px rgba(19,168,91,0.08)' : '0 8px 18px rgba(27,45,69,0.03)',
                                    }}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-[#F1F8F3] px-4 py-3">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-[#13A85B]">
                              <HotelDetailIcon kind="sparkles" className="h-6 w-6" />
                            </span>
                            <p className="text-sm font-medium leading-snug text-[#71809A]">
                              Roady will use this to search real availability on Booking.com.
                            </p>
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
                      <div
                        className={`${plannerStep === 'hotelDetails' ? 'py-3' : 'py-5'} border-t border-gray-100 px-6 sm:px-8`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleBack}
                            className="inline-flex items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-[#1B2D45]"
                          >
                            {plannerStep === 'hotelDetails' && (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24">
                                <path d="M19 12H5" strokeLinecap="round" />
                                <path d="m12 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            Back
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleContinue()}
                            disabled={!canProceed(plannerStep)}
                            className="inline-flex flex-1 items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                            style={{ backgroundColor: plannerStep === 'hotelDetails' ? '#13A85B' : '#58CC02' }}
                          >
                            {plannerStep === 'spots'
                              ? 'Suggest my trip'
                              : plannerStep === 'hotelDetails'
                                ? 'Next: choose stops'
                                : 'Next'}
                            {plannerStep === 'hotelDetails' && (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24">
                                <path d="M5 12h14" strokeLinecap="round" />
                                <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
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
