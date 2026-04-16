import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const body = await req.json();
    const { start, end, currentStops, position, preferredCategory } = body as {
      start: string;
      end: string;
      currentStops: { name: string; city: string; lat: number; lng: number; category: string }[];
      position: number;
      preferredCategory?: string;
    };

    if (!start || !end) {
      return Response.json({ error: 'Start and end are required' }, { status: 400 });
    }

    const before = currentStops.slice(0, position).map((s) => s.name).join(', ') || start;
    const after = currentStops.slice(position + 1).map((s) => s.name).join(', ') || end;
    const excluded = currentStops.map((s) => s.name).join(', ');

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 512,
      system: ROADY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `I'm planning a California road trip from "${start}" to "${end}".

The current stops on the route are: ${excluded || 'none yet'}.

I want to replace stop #${position + 1} (currently "${currentStops[position]?.name}") with a different stop.
The new stop should fit naturally between: ${before} and ${after}.
Do NOT suggest any of these existing stops: ${excluded}.${preferredCategory ? `\nThe stop MUST be of category "${preferredCategory}" — for example ${preferredCategory === 'food' ? 'a restaurant, winery, or local eatery' : preferredCategory === 'nature' ? 'a park, trail, or natural landmark' : preferredCategory === 'culture' ? 'a museum, gallery, or historical site' : preferredCategory === 'adventure' ? 'an outdoor activity, hike, or thrill experience' : 'a scenic viewpoint, overlook, or beautiful vista'}.` : ''}

Return exactly this JSON (no markdown, no extra text):
{
  "name": "string — place name",
  "city": "string — city name",
  "description": "string — 1-2 sentences about why it's worth stopping",
  "tip": "string — a specific local insider tip",
  "duration": "string — e.g. '1-2 hours'",
  "lat": number,
  "lng": number,
  "category": "nature" | "food" | "culture" | "adventure" | "scenic"
}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    try {
      const stop = JSON.parse(cleaned);
      return Response.json(stop);
    } catch {
      return Response.json({ error: 'Failed to parse stop suggestion' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `API error: ${error.message}` }, { status: error.status || 500 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
