import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { start, end, travelGroup, interests, numberOfEnrouteStops } = body;
    if (!start || !end) {
      return Response.json({ error: 'start and end required' }, { status: 400 });
    }
    const client = getClient();
    const prefLines = [
      travelGroup && `Travel group: ${travelGroup}`,
      interests && `Interests: ${interests}`,
      numberOfEnrouteStops && numberOfEnrouteStops !== '0' && `En-route stops: ${numberOfEnrouteStops}`,
    ].filter(Boolean).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: ROADY_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate 3 distinct California road trip route concepts from "${start}" to "${end}".
${prefLines}
Each concept should have a different theme or vibe (e.g. coastal, inland, scenic, foodie, adventure).
Return ONLY this JSON array — no markdown, no extra text:
[
  { "id": "1", "name": "string — catchy route name", "tagline": "string — one sentence vibe", "via": "string — 2-3 key waypoints or highlights" },
  { "id": "2", "name": "...", "tagline": "...", "via": "..." },
  { "id": "3", "name": "...", "tagline": "...", "via": "..." }
]`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return Response.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('suggest-options error:', err);
    return Response.json({ error: 'Failed to generate route options' }, { status: 500 });
  }
}
