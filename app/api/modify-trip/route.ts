import Anthropic from '@anthropic-ai/sdk';
import { ROADY_SYSTEM_PROMPT } from '@/lib/prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, tripData, start, end } = await req.json();
    if (!message || !tripData) {
      return Response.json({ error: 'message and tripData required' }, { status: 400 });
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: ROADY_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `You are Roady helping a traveler modify their existing road trip plan.

Current trip from "${start}" to "${end}" (${tripData.stops.length} stops):
${JSON.stringify(tripData, null, 2)}

The traveler says: "${message}"

RULES:
- If the traveler wants to change the trip in any way (add/remove/reorder stops, change names, durations, miles, etc.) → return action "modify" with the COMPLETE updated trip. You MUST include ALL stops (existing + new/changed). Never drop existing stops unless the traveler asked you to remove them.
- If the traveler is asking a question or making conversation (not requesting a trip change) → return action "respond".

For "modify" — return ONLY this JSON, no markdown, no extra text:
{
  "action": "modify",
  "tripData": {
    "routeName": "string",
    "tagline": "string",
    "totalMiles": number,
    "stops": [
      {
        "name": "string",
        "city": "string",
        "description": "string — 1-2 sentences",
        "tip": "string — insider tip",
        "duration": "string — e.g. 1-2 hours",
        "lat": number,
        "lng": number,
        "category": "nature" | "food" | "culture" | "adventure" | "scenic",
        "stopType": "en-route" | "destination"
      }
    ]
  }
}

For "respond" — return ONLY this JSON, no markdown, no extra text:
{ "action": "respond", "message": "your helpful conversational response" }`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.action === 'modify' && parsed.tripData) {
      // Preserve fields the AI didn't modify (hotels, destinationDescription, funFacts, tripChecklist)
      parsed.tripData = { ...tripData, ...parsed.tripData };
    }

    return Response.json(parsed);
  } catch (err) {
    console.error('modify-trip error:', err);
    return Response.json({ error: 'Failed to process modification' }, { status: 500 });
  }
}
