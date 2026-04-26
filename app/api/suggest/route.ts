import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';
import { getCuratedSpotsForDestination, buildCuratedStopsContext } from '@/lib/curated-stops';

/** Geocode a place name → [lat, lng] using Mapbox. Returns null on failure. */
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

/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Discard spots that are more than 40km from the destination. */
function filterSpotsAtDestination(
  stops: { lat: number; lng: number; [key: string]: unknown }[],
  endLat: number, endLng: number
): typeof stops {
  return stops.filter(s => haversineKm(endLat, endLng, s.lat, s.lng) <= 40);
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found. Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API')));
  }
  return new Anthropic({
    apiKey: apiKey,
  });
}

function buildPreferenceContext(body: Record<string, string>): string {
  const parts: string[] = [];

  // Travel group
  const groupLabels: Record<string, string> = {
    solo: 'a solo traveler',
    partner: 'a couple on a romantic getaway',
    'family-adults': 'a family of adults',
    'family-kids': 'a family with kids',
    friends: 'a group of friends',
  };
  if (body.travelGroup && groupLabels[body.travelGroup]) {
    parts.push(`The traveler is ${groupLabels[body.travelGroup]}.`);
  }

  // Kids ages
  if (body.kidsAges) {
    const ageLabels: Record<string, string> = {
      'baby-toddler': 'babies/toddlers (0–3)',
      'little-kids': 'little kids (4–7)',
      kids: 'kids (8–12)',
      teens: 'teens (13–17)',
    };
    const ages = body.kidsAges.split(',').map((a: string) => ageLabels[a] || a).filter(Boolean);
    if (ages.length) {
      parts.push(`They have ${ages.join(' and ')} with them.`);
    }
  }

  // Interests (wizard format — granular labels like "beaches", "wine", "hiking")
  if (body.interests) {
    const interestLabels: Record<string, string> = {
      beaches: 'beaches', hiking: 'hiking', camping: 'camping', wildlife: 'wildlife',
      sunsets: 'sunsets', surf: 'surfing', food: 'local food', 'local-food': 'local food',
      wine: 'wine tasting', coffee: 'coffee shops', breweries: 'craft breweries',
      bakeries: 'bakeries', history: 'history', art: 'art', photography: 'photography spots',
      boutique: 'boutique shopping', 'boutique-shops': 'boutique shopping',
      museums: 'museums', culture: 'culture & arts', adventure: 'adventure & thrills',
      scenic: 'scenic drives', 'national-parks': 'national parks', 'road-stops': 'roadside gems',
    };
    const mapped = body.interests.split(',').map((i: string) => interestLabels[i.trim()] || i.trim()).filter(Boolean);
    if (mapped.length) {
      parts.push(`They love: ${mapped.join(', ')}. Prioritize spots that match these interests.`);
    }
  }

  // Stop types (legacy preferences format)
  if (body.stopTypes && !body.interests) {
    const typeLabels: Record<string, string> = {
      food: 'food & dining', nature: 'nature & outdoors', museums: 'museums & culture',
      scenic: 'scenic views', adventure: 'adventure & thrills', beaches: 'beaches & water',
      shopping: 'shopping & markets', history: 'history & landmarks',
    };
    const types = body.stopTypes.split(',').map((t: string) => typeLabels[t] || t).filter(Boolean);
    if (types.length) {
      parts.push(`They are most interested in: ${types.join(', ')}.`);
    }
  }

  // Vibe
  if (body.vibe) {
    const vibeLabels: Record<string, string> = {
      relaxed: 'relaxed — slow pace, long stops, unhurried mornings',
      mixed: 'balanced — mix of active exploration and downtime',
      adventurous: 'adventurous — packed itinerary, max variety, early starts',
    };
    if (vibeLabels[body.vibe]) parts.push(`Their trip vibe is ${vibeLabels[body.vibe]}.`);
  }

  // Distance preference
  if (body.distance) {
    const distanceLabels: Record<string, string> = {
      '50-100 miles': 'a weekend escape range (50–100 miles)',
      '100-150 miles': 'a one-tank road trip (100–150 miles)',
      '200+ miles': 'a full road trip (200+ miles, multi-day)',
    };
    if (distanceLabels[body.distance]) parts.push(`They prefer ${distanceLabels[body.distance]}.`);
  }

  // En-route stops
  if (body.numberOfEnrouteStops && body.numberOfEnrouteStops !== '0') {
    const n = body.numberOfEnrouteStops;
    parts.push(`They want ${n} stop${n === '1' ? '' : 's'} along the drive en-route to the destination.`);
  }

  // Number of spots at destination
  if (body.numberOfStops) {
    if (body.numberOfStops === 'auto') {
      parts.push('Choose the best number of spots to explore (between 3 and 6).');
    } else {
      parts.push(`They want exactly ${body.numberOfStops} spot${body.numberOfStops === '1' ? '' : 's'} to explore at the destination.`);
    }
  }

  // Hotel budget + details
  if (body.hotelPreference) {
    const hotelLabels: Record<string, string> = {
      '$': 'budget-friendly (motels, hostels, affordable hotels)',
      '$$': 'mid-range comfortable hotels',
      '$$$': 'luxury hotels and upscale resorts',
    };
    const hotelParts: string[] = [];
    if (hotelLabels[body.hotelPreference]) hotelParts.push(hotelLabels[body.hotelPreference]);
    if (body.hotelGuests) hotelParts.push(`accommodating ${body.hotelGuests.replace('+', ' or more')} guest${body.hotelGuests === '1' ? '' : 's'}`);
    if (hotelParts.length) {
      parts.push(`Suggest ${hotelParts.join(', ')} hotels. CRITICAL: Every suggested hotel MUST be physically located in or immediately adjacent to the final destination city. Do NOT suggest hotels in other cities, regions, or states.`);
    }
  }

  // Travel date
  if (body.travelDate) {
    parts.push(`They are planning to travel: ${body.travelDate}.`);
  }

  // Duration
  if (body.stopDuration) {
    const durationLabels: Record<string, string> = {
      quick: 'quick spots (15–30 min each)',
      moderate: 'moderate spots (1–2 hours each)',
      deep: 'long, immersive spots (2+ hours each)',
      mix: 'a mix of quick and longer spots',
    };
    if (durationLabels[body.stopDuration]) {
      parts.push(`They prefer ${durationLabels[body.stopDuration]}.`);
    }
  }

  if (parts.length === 0) return '';
  return `\n\nTraveler preferences:\n${parts.join('\n')}\nPlease tailor the spots to match these preferences.`;
}

export async function POST(req: Request) {
  try {
    const client = getClient();
    const body = await req.json();
    const { start, end } = body;

    if (!start || !end) {
      return Response.json({ error: 'Start and end locations are required' }, { status: 400 });
    }

    // Geocode start and end in parallel to get real coordinates for sorting + prompt context
    const [startCoords, endCoords] = await Promise.all([
      geocodePlace(start),
      geocodePlace(end),
    ]);

    const preferenceContext = buildPreferenceContext(body);

    const routeHintContext = body.routeHint
      ? `\n\nThe traveler chose this route concept: "${body.routeHint}". Build the trip around this theme.`
      : '';

    const curatedStopsContext = endCoords
      ? buildCuratedStopsContext(getCuratedSpotsForDestination(endCoords[0], endCoords[1]))
      : '';

    // Determine how many spots to suggest
    let spotsInstruction: string;
    if (body.numberOfStops && body.numberOfStops !== 'auto' && body.numberOfStops !== '') {
      spotsInstruction = body.numberOfStops;
    } else {
      // Derive a smart default from vibe and distance
      let base = 4;
      if (body.vibe === 'relaxed') base = 3;
      else if (body.vibe === 'adventurous') base = 6;

      if (body.distance === '50-100 miles') base = Math.min(base, 3);
      else if (body.distance === '100-150 miles') base = Math.min(base, 4);
      else if (body.distance === '200+ miles') base = Math.max(base, 4);

      spotsInstruction = String(base);
    }

    const waypointsContext = body.waypoints
      ? `\n\nThe traveler specifically wants to include these stops: ${body.waypoints}. Build the itinerary around them — use them as stops or find nearby alternatives if exact matches don't work well on this route.`
      : '';

    const wantsHotel = body.hotelPreference && body.hotelPreference !== 'none';
    const hotelJsonField = wantsHotel
      ? `  "hotels": [
    {
      "name": "string — a real hotel name",
      "city": "string — MUST be \"${end}\" exactly (the final destination city only)",
      "priceRange": "$" | "$$" | "$$$"
    }
    // suggest 3 to 5 hotels. EVERY hotel must be physically located inside ${end}. Do NOT suggest hotels in nearby towns, suburbs, or adjacent cities.
  ],\n`
      : '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: ROADY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Plan a California road trip from "${start}" to "${end}".${startCoords && endCoords ? ` The route starts near (lat ${startCoords[0].toFixed(4)}, lng ${startCoords[1].toFixed(4)}) and ends near (lat ${endCoords[0].toFixed(4)}, lng ${endCoords[1].toFixed(4)}).` : ''}${preferenceContext}${waypointsContext}${routeHintContext}${curatedStopsContext}
${body.numberOfEnrouteStops && body.numberOfEnrouteStops !== '0'
  ? `STRICT COORDINATE BOUNDS: En-route stops must fall within the geographic corridor between "${start}" and "${end}". Destination spots must be within 40km of "${end}"${endCoords ? ` (lat ${endCoords[0].toFixed(4)}, lng ${endCoords[1].toFixed(4)})` : ''}.

Suggest ${body.numberOfEnrouteStops} stop${body.numberOfEnrouteStops === '1' ? '' : 's'} along the drive from "${start}" to "${end}" (en-route, ordered geographically from start to end), then ${spotsInstruction} spot${spotsInstruction === '1' ? '' : 's'} to explore in "${end}" (things to do and see at the destination). Return all of them in a single stops array: en-route stops first, destination spots last.`
  : `${endCoords ? `STRICT COORDINATE BOUNDS: Every spot must be within 40km of "${end}" (lat ${endCoords[0].toFixed(4)}, lng ${endCoords[1].toFixed(4)}). Spots outside this radius will be discarded.` : ''}

Suggest exactly ${spotsInstruction} interesting spots to explore in "${end}". These are things to do and see at the destination — not stops along the drive. Order them in a logical exploration sequence.`
}

Return this exact JSON structure:
{
  "routeName": "string — a catchy name for this route",
  "tagline": "string — one sentence describing the vibe",
  "totalMiles": number,
${hotelJsonField}  "stops": [
    {
      "name": "string — place name",
      "city": "string — city name",
      "description": "string — 1-2 sentences about why it's worth stopping",
      "tip": "string — a specific local insider tip",
      "duration": "string — e.g. '1-2 hours'",
      "lat": number — accurate latitude,
      "lng": number — accurate longitude,
      "category": "nature" | "food" | "culture" | "adventure" | "scenic",
      "stopType": "en-route" | "destination"
    }
  ]
}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    // Strip markdown code fences if Haiku wraps the response
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    try {
      const data = JSON.parse(cleaned);

      // Always filter destination spots to within 40km of the destination.
      // En-route stops are exempt from this filter.
      if (Array.isArray(data.stops) && endCoords) {
        const hasEnroute = body.numberOfEnrouteStops && body.numberOfEnrouteStops !== '0';
        if (hasEnroute) {
          data.stops = data.stops.filter((s: { lat: number; lng: number; stopType?: string }) =>
            s.stopType === 'en-route' || haversineKm(endCoords[0], endCoords[1], s.lat, s.lng) <= 40
          );
        } else {
          data.stops = filterSpotsAtDestination(data.stops, endCoords[0], endCoords[1]);
        }
      }

      // Enrich stops with Foursquare data in parallel (best-effort, never blocks)
      const fsqKey = process.env.FOURSQUARE_API_KEY;
      if (fsqKey && Array.isArray(data.stops)) {
        await Promise.allSettled(
          data.stops.map(async (stop: any) => {
            try {
              const params = new URLSearchParams({
                query: stop.name,
                ll: `${stop.lat},${stop.lng}`,
                radius: '2000',
                limit: '1',
                fields: 'rating,stats,hours,website,price,photos',
              });
              const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
                headers: { Authorization: fsqKey, Accept: 'application/json' },
              });
              if (!res.ok) return;
              const fsq = await res.json();
              const place = fsq.results?.[0];
              if (!place) return;

              if (place.rating != null) stop.fsqRating = place.rating;
              if (place.stats?.total_ratings) stop.fsqReviewCount = place.stats.total_ratings;
              if (place.price != null) stop.fsqPrice = place.price;
              if (place.website) stop.fsqWebsite = place.website;
              if (place.hours?.display) stop.fsqHours = place.hours.display;
              const photo = place.photos?.[0];
              if (photo?.prefix && photo?.suffix) {
                stop.fsqPhoto = `${photo.prefix}400x300${photo.suffix}`;
              }
            } catch {
              // silently skip — stop renders without enrichment
            }

          })
        );

        // Enrich each hotel in the hotels array with Foursquare + Google Places data
        if (wantsHotel && Array.isArray(data.hotels) && data.hotels.length > 0) {
          const ll = endCoords ? `${endCoords[0]},${endCoords[1]}` : '';
          await Promise.allSettled(
            data.hotels.map(async (hotel: any) => {
              if (!hotel?.name) return;

              // ── Foursquare: rating, price, coords, maybe photo ──
              try {
                const query = hotel.city ? `${hotel.name} ${hotel.city}` : hotel.name;
                const hotelParams = new URLSearchParams({
                  query,
                  ...(ll && { ll }),
                  radius: '20000',
                  limit: '1',
                  categories: '19014,19021,19025,19026,19048,19050',
                  fields: 'fsq_id,rating,website,price,photos,geocodes',
                });
                const hotelRes = await fetch(`https://api.foursquare.com/v3/places/search?${hotelParams}`, {
                  headers: { Authorization: fsqKey, Accept: 'application/json' },
                });
                if (hotelRes.ok) {
                  const hotelFsq = await hotelRes.json();
                  const hotelPlace = hotelFsq.results?.[0];
                  if (hotelPlace) {
                    if (hotelPlace.rating != null) hotel.fsqRating = hotelPlace.rating;
                    if (hotelPlace.price != null) hotel.fsqPrice = hotelPlace.price;
                    if (hotelPlace.website) hotel.fsqWebsite = hotelPlace.website;

                    let hotelPhoto = hotelPlace.photos?.[0];
                    if (!hotelPhoto && hotelPlace.fsq_id) {
                      try {
                        const photoRes = await fetch(
                          `https://api.foursquare.com/v3/places/${hotelPlace.fsq_id}/photos?limit=1`,
                          { headers: { Authorization: fsqKey, Accept: 'application/json' } }
                        );
                        if (photoRes.ok) hotelPhoto = (await photoRes.json())?.[0];
                      } catch { /* skip */ }
                    }
                    if (hotelPhoto?.prefix && hotelPhoto?.suffix) {
                      hotel.fsqPhoto = `${hotelPhoto.prefix}400x300${hotelPhoto.suffix}`;
                    }

                    const geo = hotelPlace.geocodes?.main;
                    if (geo?.latitude && geo?.longitude) {
                      const tooFar = endCoords
                        ? haversineKm(endCoords[0], endCoords[1], geo.latitude, geo.longitude) > 40
                        : false;
                      if (!tooFar) { hotel.lat = geo.latitude; hotel.lng = geo.longitude; }
                    }
                  }
                }
              } catch { /* silently skip */ }

              // ── Google Places: photo fallback (always runs if still no photo) ──
              if (!hotel.fsqPhoto) {
                const googleKey = process.env.GOOGLE_PLACES_API_KEY;
                if (googleKey) {
                  try {
                    const gpRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': googleKey,
                        'X-Goog-FieldMask': 'places.photos',
                      },
                      body: JSON.stringify({
                        textQuery: `${hotel.name} hotel ${hotel.city || ''}`.trim(),
                        maxResultCount: 1,
                        ...(endCoords && {
                          locationBias: {
                            circle: {
                              center: { latitude: endCoords[0], longitude: endCoords[1] },
                              radius: 30000,
                            },
                          },
                        }),
                      }),
                    });
                    if (gpRes.ok) {
                      const gpData = await gpRes.json();
                      const photoName = gpData.places?.[0]?.photos?.[0]?.name;
                      if (photoName) {
                        const mediaRes = await fetch(
                          `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${googleKey}&skipHttpRedirect=true`
                        );
                        if (mediaRes.ok) {
                          const mediaData = await mediaRes.json();
                          if (mediaData.photoUri) hotel.fsqPhoto = mediaData.photoUri;
                        }
                      }
                    }
                  } catch { /* silently skip */ }
                }
              }
            })
          );
        }
      }

      return Response.json(data);
    } catch {
      return Response.json({ error: 'Failed to parse trip suggestions' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return Response.json({ error: 'Too many requests — try again in a moment' }, { status: 429 });
      }
      console.error('Anthropic API error:', error.status, error.message);
      return Response.json({ error: `API error: ${error.message}` }, { status: error.status || 500 });
    }
    console.error('Suggest API error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Failed to generate trip: ${errorMsg}` }, { status: 500 });
  }
}
