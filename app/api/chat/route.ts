import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { CHAT_SYSTEM_PROMPT } from '@/lib/prompts';
import type { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: CHAT_SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ content });
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Failed to get response from Roady' }, { status: 500 });
  }
}
