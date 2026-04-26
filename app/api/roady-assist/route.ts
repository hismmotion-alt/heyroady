import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Interprets a free-text user message within the context of the guided flow.
 * Returns whether to proceed (with extracted value) or respond conversationally.
 */
export async function POST(req: Request) {
  try {
    const { step, message, prefs } = await req.json();
    if (!step || !message) {
      return Response.json({ error: 'step and message required' }, { status: 400 });
    }

    const stepInstructions: Record<string, string> = {
      asking_start: `The user was asked: "Where are you starting from?" (expecting a city, address, or location in California).
Determine if the message contains a usable starting location.
- If YES → return { "action": "proceed", "start": "<extracted location>" }
- If the message mentions BOTH a start and destination → return { "action": "proceed_both", "start": "<start>", "end": "<destination>" }
- If NO (conversational, question, or intent statement) → return { "action": "respond", "message": "<a friendly, helpful reply that acknowledges what they said and gently re-asks for their starting location>" }`,
    };

    const instruction = stepInstructions[step];
    if (!instruction) {
      return Response.json({ action: 'passthrough' });
    }

    const context = prefs?.start ? `User's known start: "${prefs.start}". ` : '';

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are Roady, a California road trip planning assistant.
${context}${instruction}

User message: "${message}"

Return ONLY valid JSON, no markdown, no extra text.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return Response.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('roady-assist error:', err);
    return Response.json({ action: 'passthrough' });
  }
}
