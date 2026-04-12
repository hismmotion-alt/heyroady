import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { start } = await req.json();
    if (!start) {
      return Response.json({ error: 'Starting location is required' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are Roady, a California road trip expert. The user is starting from: "${start}".

Suggest 6 great California road trip destinations from that starting point. Pick a variety of directions and vibes.

Return exactly this JSON (no markdown, no extra text):
{
  "routes": [
    {
      "emoji": "string — one relevant emoji for the destination type",
      "name": "string — a short evocative route name (e.g. 'Pacific Coast Highway', 'Big Sur Coastal')",
      "to": "string — destination city or place name only",
      "distance": "string — approximate driving distance from ${start} (e.g. '2.5 hr drive' or '140 miles')",
      "desc": "string — 1-2 sentences, written like a local friend recommending it, no AI language",
      "badges": [
        { "label": "string", "bg": "string — rgba color", "color": "string — hex color" },
        { "label": "string", "bg": "string — rgba color", "color": "string — hex color" }
      ]
    }
  ]
}

Badge label ideas (pick 2 per route that fit): Coastal, Nature, Hiking, Food & Wine, Desert, Mountain, Scenic Drive, Adventure, Relaxed, Beaches, Culture, Hidden Gem.
Badge colors to use:
- Coastal/Scenic Drive/Beaches: bg "rgba(55,138,221,0.1)" color "#378ADD"
- Nature/Hiking/Relaxed: bg "rgba(88,204,2,0.1)" color "#46a302"
- Food & Wine/Culture: bg "rgba(216,90,48,0.1)" color "#c2540a"
- Desert/Mountain: bg "rgba(234,179,8,0.12)" color "#a16207"
- Adventure/Hidden Gem: bg "rgba(147,51,234,0.1)" color "#9333ea"`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);
    return Response.json(data);
  } catch (error) {
    console.error('Routes API error:', error);
    return Response.json({ error: 'Failed to get route suggestions' }, { status: 500 });
  }
}
