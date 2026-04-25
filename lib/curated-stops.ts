import stopsData from './curated-stops.json';

interface CuratedStop {
  name: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  category: string;
  tags: string[];
  description: string;
  tip: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return up to maxResults curated stops that fall within the route corridor. */
export function getCuratedStopsForRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  maxResults = 15
): CuratedStop[] {
  const routeKm = haversineKm(startLat, startLng, endLat, endLng);
  // More generous threshold than the hard corridor filter — we want options for Claude to pick from
  const maxDetour = routeKm * 1.4 + 60;

  return (stopsData.stops as CuratedStop[])
    .map(s => ({
      stop: s,
      score: haversineKm(startLat, startLng, s.lat, s.lng) + haversineKm(endLat, endLng, s.lat, s.lng),
    }))
    .filter(({ score }) => score <= maxDetour)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxResults)
    .map(({ stop }) => stop);
}

/** Return up to maxResults curated spots near the destination (within 80km). */
export function getCuratedSpotsForDestination(
  endLat: number,
  endLng: number,
  maxResults = 10
): CuratedStop[] {
  return (stopsData.stops as CuratedStop[])
    .map(s => ({ stop: s, dist: haversineKm(endLat, endLng, s.lat, s.lng) }))
    .filter(({ dist }) => dist <= 80)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxResults)
    .map(({ stop }) => stop);
}

/** Format curated stops as a prompt-ready string for injection into the Claude user message. */
export function buildCuratedStopsContext(stops: CuratedStop[]): string {
  if (stops.length === 0) return '';
  const list = stops
    .map(s => `- ${s.name} (${s.city}): ${s.description} Insider tip: ${s.tip}`)
    .join('\n');
  return `\n\nHere are hand-picked local spots at or near this destination — prioritize these over generic tourist spots when they fit the traveler's preferences:\n${list}\nYou may use any of these or suggest other equally specific, non-obvious spots. Avoid well-known tourist traps.`;
}
