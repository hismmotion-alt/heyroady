import type { PlannerRouteKey } from '@/components/home/plannerData';

export type WhereToGoTag = 'scenic-routes' | 'local-charm' | 'photo-worthy' | 'good-eats';

export type WhereToGoDestination = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryColor: 'coral' | 'green' | 'gold' | 'purple';
  tags: WhereToGoTag[];
  region: string;
  description: string;
  image: string;
  stopCount: number;
  suggestedDays: number;
  fallbackRouteId: PlannerRouteKey;
};

export const WHERE_TO_GO_TAGS: Array<{
  id: WhereToGoTag;
  label: string;
  description: string;
  color: string;
  bg: string;
}> = [
  {
    id: 'scenic-routes',
    label: 'Scenic routes',
    description: 'Breathtaking drives and viewpoints',
    color: '#D85A30',
    bg: '#FFF0E9',
  },
  {
    id: 'local-charm',
    label: 'Local charm',
    description: 'Unique towns with local character',
    color: '#D8941F',
    bg: '#FFF7DF',
  },
  {
    id: 'photo-worthy',
    label: 'Photo worthy',
    description: "Spots you'll want to remember",
    color: '#1D9E75',
    bg: '#EFFFF4',
  },
  {
    id: 'good-eats',
    label: 'Good eats',
    description: 'Local flavors along the way',
    color: '#6F4BC7',
    bg: '#F1ECFF',
  },
];

export const WHERE_TO_GO_DESTINATIONS: WhereToGoDestination[] = [
  {
    id: 'big-sur',
    name: 'Big Sur',
    slug: 'big-sur',
    category: 'Scenic Drive',
    categoryColor: 'coral',
    tags: ['scenic-routes', 'photo-worthy'],
    region: 'Central Coast',
    description: 'Dramatic coastline, redwoods, cliffside pullouts, and iconic Pacific views.',
    image: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=900&q=85',
    stopCount: 12,
    suggestedDays: 4,
    fallbackRouteId: 'pch',
  },
  {
    id: 'solvang',
    name: 'Solvang',
    slug: 'solvang',
    category: 'Small Town',
    categoryColor: 'gold',
    tags: ['local-charm', 'good-eats', 'photo-worthy'],
    region: 'Santa Ynez Valley',
    description: 'A Danish-inspired town with bakeries, boutiques, wine stops, and relaxed valley roads.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=85',
    stopCount: 8,
    suggestedDays: 3,
    fallbackRouteId: 'custom',
  },
  {
    id: 'joshua-tree',
    name: 'Joshua Tree',
    slug: 'joshua-tree',
    category: 'Desert Escape',
    categoryColor: 'green',
    tags: ['photo-worthy', 'scenic-routes'],
    region: 'Inland Empire',
    description: 'Otherworldly boulders, desert art, golden light, and starry skies.',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=900&q=85',
    stopCount: 6,
    suggestedDays: 3,
    fallbackRouteId: 'desert',
  },
  {
    id: 'cambria',
    name: 'Cambria',
    slug: 'cambria',
    category: 'Coastal Town',
    categoryColor: 'purple',
    tags: ['local-charm', 'scenic-routes', 'good-eats'],
    region: 'Central Coast',
    description: 'Art galleries, ocean views, quiet beaches, and a laid-back coastal village feel.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85',
    stopCount: 7,
    suggestedDays: 3,
    fallbackRouteId: 'pch',
  },
  {
    id: 'yosemite',
    name: 'Yosemite National Park',
    slug: 'yosemite',
    category: 'Outdoor Adventure',
    categoryColor: 'green',
    tags: ['scenic-routes', 'photo-worthy'],
    region: 'Sierra Nevada',
    description: 'Granite walls, waterfalls, meadows, and classic California mountain drama.',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=900&q=85',
    stopCount: 9,
    suggestedDays: 4,
    fallbackRouteId: 'parks',
  },
  {
    id: 'palm-springs',
    name: 'Palm Springs',
    slug: 'palm-springs',
    category: 'Desert Escape',
    categoryColor: 'purple',
    tags: ['photo-worthy', 'good-eats', 'local-charm'],
    region: 'Coachella Valley',
    description: 'Retro architecture, mountain backdrops, pool-town energy, and easy desert detours.',
    image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=900&q=85',
    stopCount: 7,
    suggestedDays: 3,
    fallbackRouteId: 'desert',
  },
  {
    id: 'paso-robles',
    name: 'Paso Robles',
    slug: 'paso-robles',
    category: 'Wine Country',
    categoryColor: 'coral',
    tags: ['good-eats', 'local-charm', 'scenic-routes'],
    region: 'Central Coast',
    description: 'Rolling vineyards, warm downtown evenings, mineral springs, and slow country roads.',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=900&q=85',
    stopCount: 6,
    suggestedDays: 3,
    fallbackRouteId: 'custom',
  },
  {
    id: 'lake-tahoe',
    name: 'Lake Tahoe',
    slug: 'lake-tahoe',
    category: 'Mountain Lake',
    categoryColor: 'green',
    tags: ['scenic-routes', 'photo-worthy', 'local-charm'],
    region: 'Sierra Nevada',
    description: 'Clear blue water, alpine viewpoints, mountain towns, and year-round outdoor stops.',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=85',
    stopCount: 10,
    suggestedDays: 4,
    fallbackRouteId: 'custom',
  },
];

export function getWhereToGoDestination(slug: string | null) {
  if (!slug) return null;
  return WHERE_TO_GO_DESTINATIONS.find((destination) => destination.slug === slug) ?? null;
}
