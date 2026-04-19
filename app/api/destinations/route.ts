import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildDistanceConstraint(distance: string, start: string): string {
  if (!distance) return '';
  if (distance === '~50 miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be within 50 miles driving distance from ${start}. REJECT any destination more than 50 miles away. Do not suggest anything beyond a short day-trip radius.`;
  }
  if (distance === '50–100 miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be between 50 and 100 miles driving distance from ${start}. REJECT anything under 50 miles (too close) or over 100 miles (too far).`;
  }
  if (distance === '200+ miles') {
    return `\nDISTANCE CONSTRAINT (NON-NEGOTIABLE): Every destination MUST be at least 200 miles driving distance from ${start}. REJECT anything closer than 200 miles — nearby spots like Santa Barbara, Ojai, or Malibu are NOT acceptable. For a Los Angeles start, valid options include San Francisco (~380 mi), Big Sur (~330 mi), Lake Tahoe (~450 mi), Yosemite (~310 mi). Pick destinations that justify a multi-day road trip.`;
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
    return Response.json(data);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `API error: ${error.message}` }, { status: error.status || 500 });
    }
    console.error('Destinations API error:', error);
    return Response.json({ error: 'Failed to get destination suggestions' }, { status: 500 });
  }
}
