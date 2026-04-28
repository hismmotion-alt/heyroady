'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { geocode } from '@/lib/geocode';
import type { PlannerAnswersSnapshot, Stop, TripData } from '@/lib/types';

const PLANNER_STORAGE_KEY = 'roady_planner_state';

type SavedTripRecord = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
};

function pickRouteIcon(trip: TripData, interests: string[]) {
  const routeName = trip.routeName.toLowerCase();
  const interestSet = new Set(interests);

  if (
    routeName.includes('coast') ||
    routeName.includes('beach') ||
    routeName.includes('pacific') ||
    interestSet.has('beaches') ||
    interestSet.has('surf')
  ) {
    return '🌊';
  }

  if (
    routeName.includes('park') ||
    routeName.includes('forest') ||
    routeName.includes('yosemite') ||
    interestSet.has('national-parks')
  ) {
    return '🌲';
  }

  if (
    routeName.includes('desert') ||
    routeName.includes('joshua') ||
    routeName.includes('palm springs')
  ) {
    return '🌵';
  }

  return '🗺️';
}

function normalizePlannerStops(stops: Stop[]) {
  return stops.map((stop, index) => ({
    ...stop,
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${stop.name}-${index}`,
    recommended: stop.stopType === 'destination',
  }));
}

function derivePlannerAnswers(trip: TripData): PlannerAnswersSnapshot {
  if (trip.plannerAnswers) return trip.plannerAnswers;

  const interestMap: Record<Stop['category'], string> = {
    nature: 'hiking',
    food: 'local-food',
    culture: 'art',
    adventure: 'adventure',
    scenic: 'scenic',
  };

  const interests = trip.stops
    .map((stop) => interestMap[stop.category])
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index)
    .slice(0, 4);

  const enrouteCount = trip.stops.filter((stop) => stop.stopType === 'en-route').length;
  const destinationCount = trip.stops.filter((stop) => stop.stopType !== 'en-route').length;

  return {
    travelGroup: '',
    kidsAges: [],
    distancePreference: trip.totalMiles <= 150 ? 'under-150' : '150-plus',
    interests,
    hotelPreference: trip.hotels?.[0]?.priceRange ?? '',
    hotelGuests: '',
    hotelCheckin: '',
    hotelNights: '',
    numberOfEnrouteStops: String(enrouteCount),
    numberOfStops: String(Math.min(5, Math.max(1, destinationCount || trip.stops.length || 1))),
  };
}

function findSelectedHotelIndex(trip: SavedTripRecord) {
  const hotels = trip.trip_data.hotels ?? [];
  if (!hotels.length) return 0;

  const selectedName = trip.trip_data.selectedHotelName?.toLowerCase().trim();
  const selectedAddress = trip.trip_data.selectedHotelAddress?.toLowerCase().trim();
  const tripEnd = trip.end.toLowerCase().trim();

  const matchedIndex = hotels.findIndex((hotel) => {
    const hotelName = hotel.name.toLowerCase().trim();
    const hotelAddress = hotel.address?.toLowerCase().trim() ?? '';
    const hotelLabel = `${hotel.name}, ${hotel.city}`.toLowerCase().trim();

    return (
      (selectedName && hotelName === selectedName) ||
      (selectedAddress && hotelAddress === selectedAddress) ||
      hotelAddress === tripEnd ||
      hotelLabel === tripEnd ||
      hotelName === tripEnd
    );
  });

  return matchedIndex >= 0 ? matchedIndex : 0;
}

export default function SavedTripRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const tripId = useMemo(() => params.id as string, [params.id]);

  useEffect(() => {
    let cancelled = false;

    async function openSavedTrip() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('saved_trips')
          .select('id, start, end, trip_data')
          .eq('id', tripId)
          .single();

        if (fetchError || !data) {
          throw new Error('We could not find that saved trip.');
        }

        const savedTrip = data as SavedTripRecord;
        const matchedHotelIndex = findSelectedHotelIndex(savedTrip);
        const orderedHotels = savedTrip.trip_data.hotels?.length
          ? [
              savedTrip.trip_data.hotels[matchedHotelIndex],
              ...savedTrip.trip_data.hotels.filter((_, index) => index !== matchedHotelIndex),
            ]
          : undefined;
        const tripData = {
          ...savedTrip.trip_data,
          hotels: orderedHotels,
        };
        const plannerAnswers = derivePlannerAnswers(tripData);
        const selectedHotelIndex = 0;
        const selectedHotel = orderedHotels?.[selectedHotelIndex] ?? null;

        const [startCoords, endCoords] = await Promise.all([
          geocode(savedTrip.start).catch(() => null),
          selectedHotel?.lat != null && selectedHotel?.lng != null
            ? Promise.resolve<[number, number]>([selectedHotel.lng, selectedHotel.lat])
            : geocode(savedTrip.end).catch(() => null),
        ]);

        const state = {
          step: 'results',
          seedRouteId: 'custom',
          startInput: savedTrip.start,
          startCoords,
          prefs: plannerAnswers,
          routeOptions: [
            {
              id: `saved-${savedTrip.id}`,
              name: tripData.routeName,
              tagline: tripData.tagline,
              via: tripData.stops.slice(0, 4).map((stop) => stop.name).join(', '),
              destination: savedTrip.end,
              icon: pickRouteIcon(tripData, plannerAnswers.interests),
              fallbackRouteId: 'custom',
            },
          ],
          routeOptionIndex: 0,
          tripData,
          stops: normalizePlannerStops(tripData.stops),
          mapEndCoords: endCoords,
          selectedHotelIndex,
          autoSaveOnRestore: false,
        };

        if (cancelled) return;
        window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
        router.replace('/');
      } catch (caughtError) {
        if (cancelled) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'We could not reopen this saved trip right now.'
        );
      }
    }

    void openSavedTrip();

    return () => {
      cancelled = true;
    };
  }, [router, tripId]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: '#FAFAF9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md rounded-[32px] border border-gray-200 bg-white px-8 py-10 text-center shadow-[0_24px_70px_rgba(27,45,69,0.12)]">
        {!error ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(88,204,2,0.12)]">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#58CC02] border-t-transparent" />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em]" style={{ color: '#D85A30' }}>
              Opening your trip
            </p>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
              Bringing this saved trip back into Roady.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              We&apos;re loading it into the same planner view so the map, route card, and stay picks all stay consistent.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: '#D85A30' }}>
              Trip unavailable
            </p>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight" style={{ color: '#1B2D45' }}>
              {error}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Head back to your saved trips and try another one.
            </p>
            <button
              type="button"
              onClick={() => router.push('/my-trips')}
              className="mt-6 rounded-full px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#58CC02' }}
            >
              Go to My Trips
            </button>
          </>
        )}
      </div>
    </div>
  );
}
