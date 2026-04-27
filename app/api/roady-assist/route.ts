import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { step, message, prefs } = await req.json();
    if (!step || !message) {
      return Response.json({ error: 'step and message required' }, { status: 400 });
    }

    if (step === 'asking_start') {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are Roady, a California road trip planning assistant. The user was asked "Where are you starting from?"

Analyze their message and extract every piece of trip-planning info they provided.

Return ONLY valid JSON — no markdown, no extra text:

If a California location is found:
{
  "action": "proceed",
  "start": "<city or address they're starting from>",
  "end": "<destination city if they mentioned one, omit if not>",
  "travelGroup": "<solo|couple|family|friends — only if clearly mentioned, omit if not>",
  "interests": ["<interest from: nature|food|culture|adventure|scenic — only ones clearly implied, omit array if none>"],
  "distance": "<under-50|50-100|150-plus — only if mentioned, omit if not>",
  "acknowledgement": "<1 warm sentence confirming what you understood, e.g. 'Got it — starting from LA with the family!'>"
}

If NO location found (they're asking a question or just chatting, not providing a start):
{
  "action": "respond",
  "message": "<friendly reply that acknowledges what they said and gently asks for their starting city>"
}

Travel group mapping:
- "solo", "alone", "just me", "by myself" → "solo"
- "couple", "partner", "date night", "romantic" → "couple"
- "family", "kids", "children", "family friendly", "kid friendly" → "family"
- "friends", "group", "buddies" → "friends"

Interest mapping:
- beaches, ocean, coast, surf → "nature" and/or "scenic"
- hiking, outdoors, parks, trails → "nature"
- food, restaurants, dining, eat, wine, breweries → "food"
- museums, history, art, culture, galleries → "culture"
- adventure, thrills, active, extreme → "adventure"
- scenic drives, views, landscapes, photography → "scenic"
- "family friendly" → ["nature", "culture"]

Only include fields you are confident about. Omit uncertain ones entirely.

User message: "${message}"`,
        }],
      });

      const raw = (msg.content[0] as { type: string; text: string }).text;
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      return Response.json(JSON.parse(cleaned));
    }

    // Unknown step — pass through unchanged
    return Response.json({ action: 'passthrough' });
  } catch (err) {
    console.error('roady-assist error:', err);
    return Response.json({ action: 'passthrough' });
  }
}
