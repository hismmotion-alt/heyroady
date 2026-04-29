import type { HotelSuggestion } from '@/lib/types';

const HOTEL_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=82',
];

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function isMapLikeHotelImage(url?: string) {
  if (!url) return true;
  const normalized = url.toLowerCase();
  return (
    normalized.includes('mapbox.com/styles') ||
    normalized.includes('maps.googleapis.com/maps') ||
    normalized.includes('googleapis.com/maps/api/staticmap') ||
    normalized.includes('googleusercontent.com/maps') ||
    normalized.includes('/tiles/') ||
    normalized.includes('/satellite')
  );
}

export function isHotelFallbackImage(url?: string) {
  if (!url) return false;
  return HOTEL_FALLBACK_IMAGES.some((fallback) => fallback.split('?')[0] === url.split('?')[0]);
}

export function getHotelFallbackImageUrl(hotel: Pick<HotelSuggestion, 'name' | 'city' | 'priceRange'>) {
  const seed = `${hotel.name}-${hotel.city}-${hotel.priceRange}`;
  return HOTEL_FALLBACK_IMAGES[stableHash(seed) % HOTEL_FALLBACK_IMAGES.length];
}

export function getHotelImageUrl(
  hotel: HotelSuggestion,
  options: { includeFallback?: boolean; includeKnownFallbackAsReal?: boolean } = {}
) {
  const includeFallback = options.includeFallback ?? true;
  const includeKnownFallbackAsReal = options.includeKnownFallbackAsReal ?? true;
  const candidates = [hotel.bookingPhoto, hotel.fsqPhoto].filter(Boolean) as string[];
  const realImage = candidates.find((url) => {
    if (isMapLikeHotelImage(url)) return false;
    if (!includeKnownFallbackAsReal && isHotelFallbackImage(url)) return false;
    return true;
  });

  if (realImage) return realImage;
  return includeFallback ? getHotelFallbackImageUrl(hotel) : '';
}
