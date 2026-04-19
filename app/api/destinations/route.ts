import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildDistanceConstraint(distance: string, start: string): string {
  if (!distance) return '';
  if (distance === '50-100 miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be between 50 and 100 miles driving distance from ${start}. REJECT anything under 50 miles (too close — feels like a day-trip) or over 100 miles (too far for this preference). Verify the mileage before including each destination.`;
  }
  if (distance === '100-150 miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be between 100 and 150 miles driving distance from ${start}. REJECT anything under 100 miles (too close) or over 150 miles (too far). This is a one-tank road trip range — think wine country, coastal towns, or mountain foothills reachable in 2–3 hours. Verify the mileage before including each destination.`;
  }
  if (distance === '200+ miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be at least 200 miles driving distance from ${start}. REJECT anything closer than 200 miles. Nearby spots like Santa Barbara (~90 mi from LA), Ojai (~80 mi), or Malibu (~30 mi) are absolutely NOT acceptable for this option. For a Los Angeles start, valid options include San Francisco (~380 mi), Big Sur (~330 mi), Lake Tahoe (~450 mi), Yosemite (~310 mi), or similar long-haul destinations. Verify the mileage before including each destination.`;
  }
  return `\nDistance preference: approximately ${distance} from ${start}.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { start, travelStyle, interests, vibe, days, distance } = body;

    if (!start) {
      return Response.json({ error: 'Starting location is required' }, { status: 400 });
    }

    const interestsList = Array.isArray(interests)
      ? interests.join(', ')
      : String(interests);

    const distanceConstraint = buildDistanceConstraint(distance || '', start);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are Roady, a California road trip expert. Suggest 3 perfect California destinations for this traveler.

Traveler details:
- Starting from: ${start}
- Travel style: ${travelStyle}
- Interests: ${interestsList}
- Trip vibe: ${vibe}
- Trip duration: ${days} days
${distanceConstraint}

Return exactly this JSON (no markdown, no extra text):
{
  "destinations": [
    {
      "name": "string — destination name (city or place)",
      "region": "string — California region (e.g. Central Coast, Southern California, Bay Area)",
      "estimatedMiles": number — approximate driving miles from ${start},
      "matchScore": number — realistic match percentage between 75 and 98,
      "description": "string — 1-2 sentences about what kind of place this is",
      "whyMatch": "string — personalized reason why this matches their specific preferences",
      "whyDrive": "string — one compelling sentence on why this destination is worth the drive"
    }
  ]
}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);

    // Enrich each destination with a real Google Places photo (best-effort, parallel)
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey && Array.isArray(data.destinations)) {
      await Promise.allSettled(
        data.destinations.map(async (dest: { name: string; photoUrl?: string }) => {
          try {
            const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleKey,
                'X-Goog-FieldMask': 'places.photos',
              },
              body: JSON.stringify({ textQuery: `${dest.name} California` }),
            });
            if (!searchRes.ok) return;
            const searchData = await searchRes.json();
            const photoName = searchData.places?.[0]?.photos?.[0]?.name;
            if (!photoName) return;

            const mediaRes = await fetch(
              `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
              { headers: { 'X-Goog-Api-Key': googleKey } }
            );
            if (!mediaRes.ok) return;
            const mediaData = await mediaRes.json();
            if (mediaData.photoUri) dest.photoUrl = mediaData.photoUri;
          } catch {
            // Photo fetch failed — card will use gradient fallback
          }
        })
      );
    }

    return Response.json(data);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `API error: ${error.message}` }, { status: error.status || 500 });
    }
    console.error('Destinations API error:', error);
    return Response.json({ error: 'Failed to get destination suggestions' }, { status: 500 });
  }
}
