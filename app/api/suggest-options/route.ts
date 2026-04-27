import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function geocodePlace(query: string): Promise<[number, number] | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return null;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=us&limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const [lng, lat] = json.features?.[0]?.center ?? [];
    if (lat == null || lng == null) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns true if distMiles is within the user's selected distance band. */
function inRange(distMiles: number, distanceKey: string): boolean {
  if (distanceKey === 'under-50')  return distMiles < 55;           // small buffer
  if (distanceKey === '50-100')    return distMiles >= 45 && distMiles <= 115;
  if (distanceKey === '150-plus')  return distMiles >= 140;
  return true;
}

type RouteOption = { id: string; name: string; tagline: string; via: string; destination: string; icon: string };

async function askClaude(
  client: Anthropic,
  start: string,
  distanceLabel: string | null,
  distanceConstraint: string | null,
  prefLines: string,
  excludeDestinations: string[]
): Promise<RouteOption[]> {
  const excludeClause = excludeDestinations.length
    ? ` Do NOT suggest these destinations (they were out of range): ${excludeDestinations.join(', ')}.`
    : '';
  const distanceLine = distanceLabel ? `Distance preference: ${distanceLabel}` : 'Distance preference: not specified';
  const distanceRule = distanceConstraint
    ? `CRITICAL DISTANCE RULE: ${distanceConstraint}`
    : 'Choose destinations that make sense for a California road trip from this start point. Keep them realistic and drivable.';

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: ROADY_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Generate 3 distinct California road trip route concepts starting from "${start}".
${distanceLine}
${prefLines}
${distanceRule}${excludeClause} Each concept must have a different theme/vibe AND a different specific destination city. All destinations must be in California.
Return ONLY this JSON array — no markdown, no extra text:
[
  { "id": "1", "name": "string — catchy route name", "tagline": "string — one sentence vibe", "via": "string — 2-3 key waypoints or highlights", "destination": "string — specific city name only, e.g. Santa Barbara", "icon": "string — single relevant emoji for this route theme, e.g. 🌊 🌲 🍷 🏔️ 🌮" },
  { "id": "2", "name": "...", "tagline": "...", "via": "...", "destination": "...", "icon": "..." },
  { "id": "3", "name": "...", "tagline": "...", "via": "...", "destination": "...", "icon": "..." }
]`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      start,
      distance,
      travelGroup,
      interests,
      numberOfEnrouteStops,
      excludeDestinations = [],
    } = body;
    if (!start) {
      return Response.json({ error: 'start required' }, { status: 400 });
    }
    const client = getClient();

    const distanceLabels: Record<string, string> = {
      'under-50':  'under 50 miles',
      '50-100':    'between 50 and 100 miles',
      '150-plus':  'more than 150 miles',
    };
    const distanceConstraints: Record<string, string> = {
      'under-50':  'Destinations must be under 50 miles driving distance from start.',
      '50-100':    'Destinations must be AT LEAST 50 miles and NO MORE THAN 100 miles driving distance from start. Never suggest a nearby city under 50 miles away.',
      '150-plus':  'Destinations must be at least 150 miles driving distance from start.',
    };
    const distanceLabel = distance ? (distanceLabels[distance] ?? distance) : null;
    const distanceConstraint = distance ? (distanceConstraints[distance] ?? '') : null;
    const prefLines = [
      travelGroup && `Travel group: ${travelGroup}`,
      interests && `Interests: ${interests}`,
      numberOfEnrouteStops && numberOfEnrouteStops !== '0' && `En-route stops: ${numberOfEnrouteStops}`,
    ].filter(Boolean).join('\n');

    // Get initial suggestions from Claude
    let options = await askClaude(client, start, distanceLabel, distanceConstraint, prefLines, excludeDestinations);

    // Validate distances using geocoding only when a distance band was supplied.
    const startCoords = distance ? await geocodePlace(`${start}, California`) : null;
    if (startCoords && distance) {
      // Geocode each destination in parallel
      const destCoords = await Promise.all(
        options.map(o => geocodePlace(`${o.destination}, California`))
      );

      const invalid: string[] = [];
      const valid: RouteOption[] = [];

      options.forEach((opt, i) => {
        const coords = destCoords[i];
        if (!coords) {
          valid.push(opt); // can't validate — keep it
          return;
        }
        const distMiles = haversineKm(startCoords[0], startCoords[1], coords[0], coords[1]) * 0.621371;
        if (inRange(distMiles, distance)) {
          valid.push(opt);
        } else {
          invalid.push(opt.destination);
        }
      });

      // If some options were out of range, do one retry for the invalid ones
      if (invalid.length > 0 && valid.length < 3) {
        try {
          const needed = 3 - valid.length;
          const retry = await askClaude(client, start, distanceLabel, distanceConstraint, prefLines, [
            ...excludeDestinations,
            ...invalid,
          ]);

          // Re-validate the retried options
          const retryCoords = await Promise.all(
            retry.map(o => geocodePlace(`${o.destination}, California`))
          );

          for (let i = 0; i < retry.length && valid.length < 3; i++) {
            const coords = retryCoords[i];
            if (!coords) {
              if (valid.length < needed) valid.push(retry[i]);
              continue;
            }
            const distMiles = haversineKm(startCoords[0], startCoords[1], coords[0], coords[1]) * 0.621371;
            if (inRange(distMiles, distance)) valid.push(retry[i]);
          }
        } catch {
          // retry failed — use what we have
        }
      }

      // Return validated options (fall back to original if validation wiped everything)
      options = valid.length > 0 ? valid : options;
    }

    // Re-number IDs
    options = options.map((o, i) => ({ ...o, id: String(i + 1) }));

    return Response.json(options);
  } catch (err) {
    console.error('suggest-options error:', err);
    return Response.json({ error: 'Failed to generate route options' }, { status: 500 });
  }
}
