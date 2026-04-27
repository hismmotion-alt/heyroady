import type { Stop } from '@/lib/types';

export type PlannerRouteKey = 'pch' | 'parks' | 'desert' | 'custom';
export type StartRegion = 'north' | 'south';

export type PlannerStop = Stop & {
  id: string;
  recommended?: boolean;
};

export type PlannerRouteVariant = {
  destination: string;
  destinationCoords: [number, number];
  routeName: string;
  tagline: string;
  durationLabel: string;
  vibe: string;
  days: number;
  image: string;
  highlights: string[];
  summary: string;
  estimateNote: string;
  stops: PlannerStop[];
  bonusStops: PlannerStop[];
};

export type PlannerRouteDefinition = {
  id: PlannerRouteKey;
  label: string;
  kicker: string;
  north: PlannerRouteVariant;
  south: PlannerRouteVariant;
};

function stop(
  id: string,
  name: string,
  city: string,
  lng: number,
  lat: number,
  description: string,
  tip: string,
  duration: string,
  category: Stop['category'],
  stopType: Stop['stopType'],
  recommended = true
): PlannerStop {
  return {
    id,
    name,
    city,
    lng,
    lat,
    description,
    tip,
    duration,
    category,
    stopType,
    recommended,
  };
}

export const PLANNER_ROUTE_DEFINITIONS: Record<PlannerRouteKey, PlannerRouteDefinition> = {
  pch: {
    id: 'pch',
    label: 'Pacific Coast Highway',
    kicker: 'Ocean views, cliff roads, easy wow factor',
    north: {
      destination: 'Santa Barbara',
      destinationCoords: [-119.6982, 34.4208],
      routeName: 'California Coast',
      tagline: 'A classic north-to-south ribbon of surf towns, sea cliffs, and sunset stops.',
      durationLabel: '4 days',
      vibe: 'Scenic and breezy',
      days: 4,
      image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80',
      highlights: ['Santa Cruz', 'Big Sur', 'San Simeon'],
      summary: 'Best for travelers who want one iconic California route with a strong mix of coast, food, and view-heavy stops.',
      estimateNote: 'Usually best as a long weekend or a 4-day coast run.',
      stops: [
        stop('pch-n-1', 'Santa Cruz', 'Santa Cruz', -122.0308, 36.9741, 'Boardwalk energy, surf breaks, and a beach-town reset before the long coastal run south.', 'Grab coffee near West Cliff before getting back on Highway 1.', '1.5 hours', 'scenic', 'en-route'),
        stop('pch-n-2', 'Monterey', 'Monterey', -121.8947, 36.6002, 'Cannery Row, sea otters, and one of the prettiest bayfront walks in the state.', 'If time is tight, do a quick harbor walk and keep the momentum going.', '1 hour', 'food', 'en-route'),
        stop('pch-n-3', 'Big Sur', 'Big Sur', -121.8081, 36.2704, 'The dramatic stretch everyone came for: cliffs, bridges, redwoods, and that impossible water color.', 'McWay Falls is the easiest high-payoff stop if you only pick one.', '2 hours', 'nature', 'destination'),
        stop('pch-n-4', 'San Simeon', 'San Simeon', -121.1899, 35.6439, 'Elephant seals, moody bluffs, and a slower section of the coast before the final push south.', 'Pull over for the elephant seal rookery even if you are only stopping for 20 minutes.', '45 min', 'scenic', 'destination'),
        stop('pch-n-5', 'Santa Barbara', 'Santa Barbara', -119.6982, 34.4208, 'Palm-lined walks, Spanish revival architecture, and an easy arrival city to settle into.', 'State Street is the simplest place to start exploring on foot.', '2 hours', 'food', 'destination'),
      ],
      bonusStops: [
        stop('pch-n-b1', 'Half Moon Bay', 'Half Moon Bay', -122.4286, 37.4636, 'A calm start with bluff walks and small-town coastal energy.', 'A good swap-in if you want a gentler first stop than Santa Cruz.', '45 min', 'scenic', 'en-route'),
        stop('pch-n-b2', 'Carmel-by-the-Sea', 'Carmel', -121.9233, 36.5552, 'Storybook cottages, galleries, and a polished little downtown.', 'Great if you want the route to feel a little more romantic.', '1 hour', 'culture', 'destination'),
      ],
    },
    south: {
      destination: 'Big Sur',
      destinationCoords: [-121.8081, 36.2704],
      routeName: 'Pacific Coast Highway',
      tagline: 'An LA-to-Big-Sur coast drive with all the postcard moments baked in.',
      durationLabel: '4 days',
      vibe: 'Coastal and cinematic',
      days: 4,
      image: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=1200&q=80',
      highlights: ['Santa Barbara', 'Morro Bay', 'McWay Falls'],
      summary: 'Best for first-time California road trippers and anyone who wants the strongest scenic payoff with minimal friction.',
      estimateNote: 'Perfect when you want an instant answer and a route that already feels finished.',
      stops: [
        stop('pch-s-1', 'Santa Barbara', 'Santa Barbara', -119.6982, 34.4208, 'A polished first stop with beach air, courthouse views, and easy food options.', 'Park once near State Street and do the rest on foot.', '2 hours', 'food', 'en-route'),
        stop('pch-s-2', 'San Luis Obispo', 'San Luis Obispo', -120.6596, 35.2828, 'Coffee, mission architecture, and a friendly downtown that breaks up the drive nicely.', 'This is a strong lunch stop if you want to keep the rest of the route lighter.', '1 hour', 'culture', 'en-route'),
        stop('pch-s-3', 'Morro Bay', 'Morro Bay', -120.8499, 35.3658, 'Harbor seafood, sea otters, and the iconic rock rising beside the water.', 'If the weather is clear, the waterfront walk is worth the detour by itself.', '45 min', 'food', 'destination'),
        stop('pch-s-4', 'Ragged Point', 'Ragged Point', -121.4442, 35.7808, 'The gateway feeling to Big Sur, where the coastline suddenly gets dramatic.', 'Good place to reset, stretch, and take the first big panorama shot.', '30 min', 'scenic', 'destination'),
        stop('pch-s-5', 'Big Sur', 'Big Sur', -121.8081, 36.2704, 'Redwoods, cliffs, and hidden coves that make the whole route feel earned.', 'Aim for late-afternoon light if you want the cliffs at their best.', '2 hours', 'nature', 'destination'),
      ],
      bonusStops: [
        stop('pch-s-b1', 'Malibu', 'Malibu', -118.7798, 34.0259, 'An easy opening move with wide beaches and a gentle start to the drive.', 'Use this if you want a softer first leg out of LA.', '1 hour', 'scenic', 'en-route'),
        stop('pch-s-b2', 'Pismo Beach', 'Pismo Beach', -120.6413, 35.1428, 'Clams, dunes, and a beach-town stop that adds a little more breathing room.', 'Useful if you want one more overnight-friendly stop before Big Sur.', '1 hour', 'scenic', 'destination'),
      ],
    },
  },
  parks: {
    id: 'parks',
    label: 'National Parks',
    kicker: 'Granite, giant trees, waterfalls, and big-sky California',
    north: {
      destination: 'Yosemite Valley',
      destinationCoords: [-119.5735, 37.7459],
      routeName: 'National Parks Escape',
      tagline: 'A clean Yosemite-focused route that feels adventurous without getting chaotic.',
      durationLabel: '4 days',
      vibe: 'Fresh-air reset',
      days: 4,
      image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
      highlights: ['Groveland', 'Tunnel View', 'Glacier Point'],
      summary: 'Best for travelers who want nature to do the heavy lifting and prefer a more immersive destination once they arrive.',
      estimateNote: 'Built for a slower pace with fewer but higher-reward stops.',
      stops: [
        stop('parks-n-1', 'Oakdale', 'Oakdale', -120.8472, 37.7666, 'A practical reset before the mountain climb, with old-school road-trip energy.', 'Stock up here before park pricing kicks in.', '30 min', 'food', 'en-route'),
        stop('parks-n-2', 'Groveland', 'Groveland', -120.2327, 37.8383, 'A small Gold Country town that eases you into the Sierra mood.', 'It is a good last coffee stop before the park proper.', '45 min', 'culture', 'en-route'),
        stop('parks-n-3', 'Tunnel View', 'Yosemite', -119.8278, 37.7152, 'The classic reveal of the valley and still one of the best first-glance moments in California.', 'Stop here first if you want the arrival to land emotionally.', '30 min', 'scenic', 'destination'),
        stop('parks-n-4', 'Yosemite Valley', 'Yosemite', -119.5735, 37.7459, 'Waterfalls, granite walls, and an all-day concentration of famous sights.', 'Keep this stop loose so you can wander instead of rushing the park.', '3 hours', 'nature', 'destination'),
        stop('parks-n-5', 'Glacier Point', 'Yosemite', -119.5738, 37.7276, 'High-elevation views that make the whole valley feel impossibly big.', 'Sunset here is worth building the day around when the road is open.', '1.5 hours', 'adventure', 'destination'),
      ],
      bonusStops: [
        stop('parks-n-b1', 'Mariposa Grove', 'Yosemite', -119.6107, 37.5036, 'A giant-sequoia detour that changes the feel of the route instantly.', 'A strong swap if you want more trees and less valley traffic.', '1.5 hours', 'nature', 'destination'),
        stop('parks-n-b2', 'El Capitan Meadow', 'Yosemite', -119.6376, 37.7348, 'A quieter place to simply stare up at the wall and slow the pace down.', 'Useful when you want one stop that asks almost nothing of you.', '30 min', 'scenic', 'destination'),
      ],
    },
    south: {
      destination: 'Sequoia National Park',
      destinationCoords: [-118.7604, 36.4864],
      routeName: 'National Parks Escape',
      tagline: 'A giant-trees route with just enough stops to keep the drive feeling alive.',
      durationLabel: '4 days',
      vibe: 'Big trees and mountain air',
      days: 4,
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
      highlights: ['Visalia', 'Moro Rock', 'Giant Forest'],
      summary: 'Best for families and groups that want nature, leg-stretching, and one truly memorable finish.',
      estimateNote: 'This one works especially well when you want a park trip without overplanning every hour.',
      stops: [
        stop('parks-s-1', 'Bakersfield', 'Bakersfield', -119.0187, 35.3733, 'A practical reset before the foothills with easy food and fuel options.', 'Keep this quick and save your energy for the park.', '30 min', 'food', 'en-route'),
        stop('parks-s-2', 'Visalia', 'Visalia', -119.2921, 36.3302, 'A friendlier gateway town where the trip starts to feel greener and calmer.', 'This is a good lunch stop before the climb into the trees.', '45 min', 'culture', 'en-route'),
        stop('parks-s-3', 'Giant Forest', 'Sequoia', -118.7514, 36.5646, 'Towering sequoias and the kind of scale that changes how the whole trip feels.', 'Arrive with time to walk slowly instead of trying to rush multiple groves.', '2 hours', 'nature', 'destination'),
        stop('parks-s-4', 'Moro Rock', 'Sequoia', -118.7654, 36.5468, 'One of the highest-payoff viewpoints in the park for the amount of effort involved.', 'The steps are short but exposed, so go early if it is hot.', '45 min', 'adventure', 'destination'),
        stop('parks-s-5', 'Crescent Meadow', 'Sequoia', -118.7484, 36.5611, 'A softer, meadow-filled finish that cools the pace back down.', 'It is ideal as the final stop before calling the day done.', '1 hour', 'nature', 'destination'),
      ],
      bonusStops: [
        stop('parks-s-b1', 'Three Rivers', 'Three Rivers', -118.8803, 36.4386, 'A laid-back gateway town with river views and easy roadside food.', 'Add this if you want a more relaxed park approach.', '45 min', 'food', 'en-route'),
        stop('parks-s-b2', 'Tunnel Log', 'Sequoia', -118.7513, 36.5802, 'A classic, playful park stop that makes the route feel a little lighter.', 'Good if kids are in the car or you want a more whimsical beat.', '20 min', 'culture', 'destination'),
      ],
    },
  },
  desert: {
    id: 'desert',
    label: 'Desert Route',
    kicker: 'Warm light, strange landscapes, and late-night sky',
    north: {
      destination: 'Death Valley',
      destinationCoords: [-116.8258, 36.5054],
      routeName: 'Desert and Stars',
      tagline: 'A farther-flung route for travelers who want California to feel a little surreal.',
      durationLabel: '5 days',
      vibe: 'Moody and adventurous',
      days: 5,
      image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80',
      highlights: ['Alabama Hills', 'Zabriskie Point', 'Badwater Basin'],
      summary: 'Best for travelers who want the most dramatic contrast from city life and do not mind a longer drive.',
      estimateNote: 'The long-drive option in the set, but it rewards that commitment fast.',
      stops: [
        stop('desert-n-1', 'Lone Pine', 'Lone Pine', -118.0634, 36.6060, 'A small mountain-desert town that marks the route turning cinematic.', 'This is your easiest reset before the landscape gets more extreme.', '45 min', 'food', 'en-route'),
        stop('desert-n-2', 'Alabama Hills', 'Lone Pine', -118.1004, 36.6066, 'Rounded boulders, huge skies, and one of the most photogenic detours in the state.', 'Sunrise and sunset are the best versions of this stop by far.', '1.5 hours', 'scenic', 'destination'),
        stop('desert-n-3', 'Panamint Springs', 'Death Valley', -117.4672, 36.3397, 'A useful high-desert break before the valley opens up.', 'Good place to slow down and check conditions before continuing.', '30 min', 'adventure', 'destination'),
        stop('desert-n-4', 'Zabriskie Point', 'Death Valley', -116.8105, 36.4204, 'Layered badlands and one of the most recognizable desert viewpoints in California.', 'Golden hour turns this stop into a completely different place.', '45 min', 'scenic', 'destination'),
        stop('desert-n-5', 'Badwater Basin', 'Death Valley', -116.8258, 36.2299, 'Salt flats, heat shimmer, and the full other-planet feeling.', 'Do this early or late and keep water handy.', '1 hour', 'nature', 'destination'),
      ],
      bonusStops: [
        stop('desert-n-b1', 'Mesquite Flat Sand Dunes', 'Death Valley', -117.1166, 36.6059, 'A softer, flowing texture break from the harsher rock views.', 'A great surprise pick when you want the trip to feel more dreamlike.', '45 min', 'adventure', 'destination'),
        stop('desert-n-b2', "Artist's Palette", 'Death Valley', -116.7096, 36.3635, 'Mineral-streaked hills in pastel colors that feel almost painted.', 'This works well if you want one stop that photographs beautifully with almost no effort.', '30 min', 'scenic', 'destination'),
      ],
    },
    south: {
      destination: 'Joshua Tree',
      destinationCoords: [-116.3087, 34.1347],
      routeName: 'Desert and Stars',
      tagline: 'A warm-weather desert loop with weird art, boulders, and golden-hour payoff.',
      durationLabel: '3 days',
      vibe: 'Playful and offbeat',
      days: 3,
      image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80',
      highlights: ['Palm Springs', 'Pioneertown', 'Keys View'],
      summary: 'Best for faster weekend trips, couples, and friends who want strong visuals with a lighter planning burden.',
      estimateNote: 'This is the easiest spontaneous route in the set.',
      stops: [
        stop('desert-s-1', 'Palm Springs', 'Palm Springs', -116.5453, 33.8303, 'Pool-town energy, good brunch options, and a stylish way to open the route.', 'Start early and let this be your slowest stop.', '1.5 hours', 'food', 'en-route'),
        stop('desert-s-2', 'Pioneertown', 'Yucca Valley', -116.4861, 34.1564, 'A strange little Old West set turned desert hangout that instantly changes the mood.', 'Good swap if you want the route to feel more local and less park-only.', '1 hour', 'culture', 'en-route'),
        stop('desert-s-3', 'Hidden Valley', 'Joshua Tree', -116.1669, 34.0120, 'Short loop trails and giant boulders without much commitment.', 'One of the easiest high-payoff park stops for mixed groups.', '1 hour', 'nature', 'destination'),
        stop('desert-s-4', 'Cholla Cactus Garden', 'Joshua Tree', -115.8243, 33.9246, 'A surreal cactus field that glows at sunrise and sunset.', 'This is the easiest place to make the trip feel otherworldly.', '30 min', 'scenic', 'destination'),
        stop('desert-s-5', 'Keys View', 'Joshua Tree', -116.1862, 33.9227, 'A full desert overlook to close the route on a wide-open note.', 'Aim for late afternoon if you want the basin layered with color.', '30 min', 'adventure', 'destination'),
      ],
      bonusStops: [
        stop('desert-s-b1', 'Noah Purifoy Outdoor Museum', 'Joshua Tree', -116.2537, 34.1487, 'A sprawling outdoor art environment that makes the route feel more personal and weird.', 'Add this when you want less hiking and more story.', '45 min', 'culture', 'destination'),
        stop('desert-s-b2', 'The Integratron', 'Landers', -116.3715, 34.2895, 'A cult-favorite sound bath dome and one of the route’s best conversation starters.', 'Good surprise move for a slower, more memorable desert day.', '1 hour', 'culture', 'destination'),
      ],
    },
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    kicker: 'A flexible starting point you can shape fast',
    north: {
      destination: 'Lake Tahoe',
      destinationCoords: [-120.0324, 39.0968],
      routeName: 'California Mix',
      tagline: 'A flexible Sierra route that gives you strong bones and room to play.',
      durationLabel: '4 days',
      vibe: 'Balanced and personal',
      days: 4,
      image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80',
      highlights: ['Auburn', 'Placerville', 'Emerald Bay'],
      summary: 'Best for travelers who want a ready-made route but still want the most control over the final stop list.',
      estimateNote: 'This route is intentionally the easiest one to customize heavily.',
      stops: [
        stop('custom-n-1', 'Sacramento', 'Sacramento', -121.4944, 38.5816, 'A practical launchpad with food, coffee, and plenty of ways to ease into the trip.', 'Use this as your clean reset before the foothills.', '45 min', 'food', 'en-route'),
        stop('custom-n-2', 'Auburn', 'Auburn', -121.0811, 38.8966, 'Gold Country texture, canyon views, and a comfortable first real stop.', 'A strong coffee stop if you want to keep the route moving.', '45 min', 'culture', 'en-route'),
        stop('custom-n-3', 'Placerville', 'Placerville', -120.8049, 38.7296, 'Old main street charm and a softer mid-route break.', 'Easy to do quickly if you mostly want the historic feel.', '30 min', 'culture', 'destination'),
        stop('custom-n-4', 'South Lake Tahoe', 'Lake Tahoe', -119.9772, 38.9399, 'Beaches, food, and a straightforward place to settle into the lake.', 'Good first Tahoe stop if you want food before scenery.', '1.5 hours', 'food', 'destination'),
        stop('custom-n-5', 'Emerald Bay', 'Lake Tahoe', -120.1137, 38.9547, 'The classic viewpoint and the fastest way to make Tahoe feel enormous.', 'Do not skip this even if you are short on time.', '45 min', 'scenic', 'destination'),
      ],
      bonusStops: [
        stop('custom-n-b1', 'Donner Lake', 'Truckee', -120.2710, 39.3250, 'A quieter water stop with less traffic and a more local feel.', 'Swap this in if you want the trip to feel more relaxed.', '45 min', 'nature', 'destination'),
        stop('custom-n-b2', 'Truckee', 'Truckee', -120.1833, 39.3270, 'A mountain town stop with shops, coffee, and an easy overnight vibe.', 'Useful if you want the route to feel a bit more town-and-trail.', '1 hour', 'food', 'destination'),
      ],
    },
    south: {
      destination: 'San Luis Obispo',
      destinationCoords: [-120.6596, 35.2828],
      routeName: 'California Mix',
      tagline: 'A flexible coast-and-country sampler that stays easy to edit.',
      durationLabel: '3 days',
      vibe: 'Easygoing and editable',
      days: 3,
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
      highlights: ['Ojai', 'Solvang', 'Pismo Beach'],
      summary: 'Best for travelers who know they want to tweak things and still want a route that already feels coherent.',
      estimateNote: 'The most forgiving route if you want to add or remove stops on the fly.',
      stops: [
        stop('custom-s-1', 'Malibu', 'Malibu', -118.7798, 34.0259, 'An easy coastal opener that keeps the route feeling bright and light.', 'Nice first move if you want the trip to start scenic right away.', '1 hour', 'scenic', 'en-route'),
        stop('custom-s-2', 'Ojai', 'Ojai', -119.2429, 34.4481, 'A small-town inland detour with citrus groves, boutiques, and a slower rhythm.', 'Add more time here if you want the route to feel softer and less coastal.', '1.5 hours', 'culture', 'en-route'),
        stop('custom-s-3', 'Solvang', 'Solvang', -120.1390, 34.5958, 'Playful architecture, bakeries, and a built-in mood shift.', 'This is the easiest stop to turn into a lunch break.', '1 hour', 'food', 'destination'),
        stop('custom-s-4', 'Pismo Beach', 'Pismo Beach', -120.6413, 35.1428, 'A wide-open beach stop with enough space to breathe before the finish.', 'Good place to add sunset if you are stretching the trip.', '1 hour', 'scenic', 'destination'),
        stop('custom-s-5', 'San Luis Obispo', 'San Luis Obispo', -120.6596, 35.2828, 'A friendly landing city that can turn into an overnight without extra planning.', 'Mission Plaza is the easiest first walk after check-in.', '1.5 hours', 'food', 'destination'),
      ],
      bonusStops: [
        stop('custom-s-b1', 'Ventura', 'Ventura', -119.2945, 34.2746, 'A relaxed coast-town stop that keeps the drive from feeling too packed.', 'Great if you want to break the first half of the route up a bit more.', '45 min', 'scenic', 'en-route'),
        stop('custom-s-b2', 'Avila Beach', 'Avila Beach', -120.7318, 35.1800, 'A smaller, warmer-feeling beach stop close to the finish.', 'A good surprise pick if you want a softer ending than another town center.', '45 min', 'scenic', 'destination'),
      ],
    },
  },
};

export const PLANNER_ROUTE_ORDER: PlannerRouteKey[] = ['pch', 'parks', 'desert', 'custom'];

export const HOME_PREVIEW_STEPS = [
  { label: 'Starting point', sub: 'Set where the drive begins' },
  { label: 'Travel crew', sub: 'Tell Roady who is coming along' },
  { label: 'Trip vibe', sub: 'Pick interests and hotel style' },
  { label: 'Roady suggestion', sub: 'Get a route built from your answers' },
  { label: 'Save or export', sub: 'Keep it, share it, or open it in Maps' },
];

export const POPULAR_STARTS = ['Los Angeles', 'San Francisco', 'San Diego'];
