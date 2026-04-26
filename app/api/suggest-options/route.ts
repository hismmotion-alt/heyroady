import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { start, distance, travelGroup, interests, numberOfEnrouteStops } = body;
    if (!start || !distance) {
      return Response.json({ error: 'start and distance required' }, { status: 400 });
    }
    const client = getClient();
    const distanceLabels: Record<string, string> = {
      'under-50':  'under 50 miles',
      '50-100':    'between 50 and 100 miles',
      '150-plus':  'more than 150 miles',
    };
    const distanceConstraints: Record<string, string> = {
      'under-50':  'Destinations must be less than 50 miles from start.',
      '50-100':    'Destinations must be AT LEAST 50 miles and NO MORE THAN 100 miles from start. Do NOT pick nearby towns under 50 miles away.',
      '150-plus':  'Destinations must be at least 150 miles from start.',
    };
    const distanceLabel = distanceLabels[distance] ?? distance;
    const distanceConstraint = distanceConstraints[distance] ?? '';
    const prefLines = [
      travelGroup && `Travel group: ${travelGroup}`,
      interests && `Interests: ${interests}`,
      numberOfEnrouteStops && numberOfEnrouteStops !== '0' && `En-route stops: ${numberOfEnrouteStops}`,
    ].filter(Boolean).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: ROADY_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate 3 distinct California road trip route concepts starting from "${start}".
Distance preference: ${distanceLabel}
${prefLines}
CRITICAL DISTANCE RULE: ${distanceConstraint} Each concept must have a different theme/vibe AND a different specific destination city. All destinations must be in California.
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
    return Response.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('suggest-options error:', err);
    return Response.json({ error: 'Failed to generate route options' }, { status: 500 });
  }
}
