import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Willing to drive: ${distance} from starting point

Return exactly this JSON (no markdown, no extra text):
{
  "destinations": [
    {
      "name": "string — destination name (city or place)",
      "region": "string — California region (e.g. Central Coast, Southern California, Bay Area)",
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
