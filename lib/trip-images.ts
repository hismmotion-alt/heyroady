import type { Stop } from '@/lib/types';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82';

const CATEGORY_IMAGES: Record<Stop['category'] | 'destination', string> = {
  nature: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=82',
  food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=82',
  culture: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=82',
  adventure: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=82',
  scenic: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=82',
  destination: DEFAULT_IMAGE,
};

const LOCATION_IMAGES: Array<[RegExp, string]> = [
  [/santa barbara/i, 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=900&q=82'],
  [/big sur|monterey|carmel/i, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=82'],
  [/san francisco|golden gate/i, 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=900&q=82'],
  [/los angeles|malibu|santa monica/i, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82'],
  [/san diego|la jolla/i, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82'],
  [/palm springs|joshua tree|death valley|desert/i, 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=82'],
  [/yosemite|sequoia|tahoe|mammoth|mountain/i, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=82'],
  [/napa|sonoma|wine|vineyard|paso robles/i, 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=82'],
  [/redwood|forest/i, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=82'],
  [/beach|coast|ocean|pier/i, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82'],
];

export function getTravelImageUrl({
  name = '',
  city = '',
  category,
  width = 900,
}: {
  name?: string;
  city?: string;
  category?: Stop['category'] | 'destination';
  width?: number;
}) {
  const query = `${name} ${city}`;
  const matched = LOCATION_IMAGES.find(([pattern]) => pattern.test(query))?.[1]
    ?? (category ? CATEGORY_IMAGES[category] : DEFAULT_IMAGE);

  try {
    const url = new URL(matched);
    url.searchParams.set('w', String(width));
    return url.toString();
  } catch {
    return matched;
  }
}
