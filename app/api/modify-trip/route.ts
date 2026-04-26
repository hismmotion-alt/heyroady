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
        content: `You are Roady helping modify an existing road trip plan.

Current trip from "${start}" to "${end}":
${JSON.stringify(tripData, null, 2)}

The traveler says: "${message}"

If they want to modify the trip (add/remove/reorder stops, change names, durations, update miles, etc.):
Return ONLY this JSON — no markdown, no extra text:
{ "action": "modify", "tripData": { "routeName": "...", "tagline": "...", "totalMiles": number, "stops": [ { "name": "...", "city": "...", "description": "...", "tip": "...", "duration": "...", "lat": number, "lng": number, "category": "nature"|"food"|"culture"|"adventure"|"scenic", "stopType": "en-route"|"destination" } ] } }

If they are asking a question or want advice (not requesting a structural change to the trip):
Return ONLY this JSON — no markdown, no extra text:
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
