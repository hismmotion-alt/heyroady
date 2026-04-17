import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

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

  // Stop types
  if (body.stopTypes) {
    const typeLabels: Record<string, string> = {
      food: 'food & dining',
      nature: 'nature & outdoors',
      museums: 'museums & culture',
      scenic: 'scenic views',
      adventure: 'adventure & thrills',
      beaches: 'beaches & water',
      shopping: 'shopping & markets',
      history: 'history & landmarks',
    };
    const types = body.stopTypes.split(',').map((t: string) => typeLabels[t] || t).filter(Boolean);
    if (types.length) {
      parts.push(`They are most interested in: ${types.join(', ')}.`);
    }
  }

  // Number of stops
  if (body.numberOfStops) {
    if (body.numberOfStops === 'auto') {
      parts.push('Choose the best number of stops for this route (between 3 and 6).');
    } else {
      parts.push(`They want exactly ${body.numberOfStops} stop${body.numberOfStops === '1' ? '' : 's'} along the way.`);
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
      parts.push(`Suggest a ${hotelParts.join(', ')} at the final destination.`);
    }
  }

  // Duration
  if (body.stopDuration) {
    const durationLabels: Record<string, string> = {
      quick: 'quick stops (15–30 min each)',
      moderate: 'moderate stops (1–2 hours each)',
      deep: 'long, immersive stops (2+ hours each)',
      mix: 'a mix of quick and longer stops',
    };
    if (durationLabels[body.stopDuration]) {
      parts.push(`They prefer ${durationLabels[body.stopDuration]}.`);
    }
  }

  if (parts.length === 0) return '';
  return `\n\nTraveler preferences:\n${parts.join('\n')}\nPlease tailor the stops to match these preferences.`;
}

export async function POST(req: Request) {
  try {
    const client = getClient();
    const body = await req.json();
    const { start, end } = body;

    if (!start || !end) {
      return Response.json({ error: 'Start and end locations are required' }, { status: 400 });
    }

    const preferenceContext = buildPreferenceContext(body);

    // Determine how many stops to suggest
    let stopsInstruction = '4-6';
    if (body.numberOfStops && body.numberOfStops !== 'auto') {
      stopsInstruction = body.numberOfStops;
    }

    const waypointsContext = body.waypoints
      ? `\n\nThe traveler specifically wants to include these stops: ${body.waypoints}. Build the itinerary around them — use them as stops or find nearby alternatives if exact matches don't work well on this route.`
      : '';

    const wantsHotel = body.hotelPreference && body.hotelPreference !== 'none';
    const hotelJsonField = wantsHotel
      ? `  "hotels": [
    {
      "name": "string — a real hotel at or near the final destination",
      "city": "string — city name of the final destination",
      "priceRange": "$" | "$$" | "$$$"
    }
    // suggest 3 to 5 distinct hotels at the final destination, varying by style and price
  ],\n`
      : '';

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2048,
      system: ROADY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Plan a California road trip from "${start}" to "${end}".${preferenceContext}${waypointsContext}

IMPORTANT: Order all stops geographically along the route from "${start}" to "${end}". Never suggest a stop that requires backtracking or going in the opposite direction.

Suggest exactly ${stopsInstruction} interesting stops along the way (not including start/end — those are just for routing).

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
      "category": "nature" | "food" | "culture" | "adventure" | "scenic"
    }
  ]
}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    try {
      const data = JSON.parse(raw);

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

        // Enrich each hotel in the hotels array with Foursquare data
        if (wantsHotel && Array.isArray(data.hotels) && data.hotels.length > 0) {
          const lastStop = data.stops?.[data.stops.length - 1];
          const ll = lastStop ? `${lastStop.lat},${lastStop.lng}` : '';
          await Promise.allSettled(
            data.hotels.map(async (hotel: any) => {
              if (!hotel?.name) return;
              try {
                const hotelParams = new URLSearchParams({
                  query: hotel.name,
                  ...(ll && { ll }),
                  radius: '10000',
                  limit: '1',
                  categories: '19014',
                  fields: 'rating,website,price,photos,geocodes',
                });
                const hotelRes = await fetch(`https://api.foursquare.com/v3/places/search?${hotelParams}`, {
                  headers: { Authorization: fsqKey, Accept: 'application/json' },
                });
                if (!hotelRes.ok) return;
                const hotelFsq = await hotelRes.json();
                const hotelPlace = hotelFsq.results?.[0];
                if (!hotelPlace) return;

                if (hotelPlace.rating != null) hotel.fsqRating = hotelPlace.rating;
                if (hotelPlace.price != null) hotel.fsqPrice = hotelPlace.price;
                if (hotelPlace.website) hotel.fsqWebsite = hotelPlace.website;
                const hotelPhoto = hotelPlace.photos?.[0];
                if (hotelPhoto?.prefix && hotelPhoto?.suffix) {
                  hotel.fsqPhoto = `${hotelPhoto.prefix}400x300${hotelPhoto.suffix}`;
                }
                // Store coordinates so we can update the map when the hotel is selected
                const geo = hotelPlace.geocodes?.main;
                if (geo?.latitude && geo?.longitude) {
                  hotel.lat = geo.latitude;
                  hotel.lng = geo.longitude;
                }
              } catch {
                // silently skip
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
