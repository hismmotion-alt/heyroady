'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Message, TripData } from '@/lib/types';

type ChatMessage = Message & { id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateEmail(email: string): string {
  return email.length > 22 ? email.slice(0, 19) + '…' : email;
}

function extractGenerateParams(content: string): Record<string, string> | null {
  const idx = content.indexOf('GENERATE_TRIP:');
  if (idx === -1) return null;
  try {
    return JSON.parse(content.slice(idx + 'GENERATE_TRIP:'.length));
  } catch {
    return null;
  }
}

function getDisplayContent(content: string): string {
  const idx = content.indexOf('GENERATE_TRIP:');
  return idx === -1 ? content : content.slice(0, idx).trim();
}

// ─── Chat content ─────────────────────────────────────────────────────────────

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMessage = searchParams.get('message') || '';

  const loadId = searchParams.get('load') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingTrip, setGeneratingTrip] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auth ──
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendToRoady = useCallback(async (msgs: ChatMessage[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      });
      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || 'Sorry, something went wrong.',
      };
      setMessages([...msgs, assistantMsg]);
    } catch {
      setMessages([...msgs, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Try again?',
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-send first message from URL param (once on mount)
  useEffect(() => {
    if (initialized.current || !initialMessage) return;
    initialized.current = true;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: initialMessage };
    setMessages([userMsg]);
    sendToRoady([userMsg]);
  }, []); // intentionally empty deps — run once on mount

  // Load conversation from /chat/[id] redirect
  useEffect(() => {
    if (!loadId || initialized.current) return;
    try {
      const stored = sessionStorage.getItem(`roady_conv_${loadId}`);
      if (!stored) return;
      const msgs = JSON.parse(stored) as Message[];
      setMessages(msgs.map((m) => ({ ...m, id: crypto.randomUUID() })));
      setConversationId(loadId);
      initialized.current = true;
      sessionStorage.removeItem(`roady_conv_${loadId}`);
    } catch { /* ignore */ }
  }, [loadId]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    sendToRoady(newMessages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize textarea up to max-height
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function handleNewChat() {
    setMessages([]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  async function handleGenerateClick(params: Record<string, string>) {
    const start = params.start || '';
    const end = params.end || '';
    if (!start || !end) return;

    setGeneratingTrip(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          travelStyle: params.travelStyle || '',
          interests: params.interests || '',
          vibe: params.vibe || '',
          distance: params.distance || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to generate trip');
      const tripData: TripData = await res.json();
      sessionStorage.setItem('roady_trip_data', JSON.stringify(tripData));
      const qs = new URLSearchParams({ start, end });
      router.push(`/trip?${qs.toString()}`);
    } catch {
      // fall back to navigating to /trip which will fetch on its own
      const qs = new URLSearchParams({ start, end });
      router.push(`/trip?${qs.toString()}`);
    } finally {
      setGeneratingTrip(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
      style={{ backgroundColor: '#F3F4F2' }}
    >
      {/* ── LEFT PANEL — Chat ── */}
      <aside className="w-full lg:w-[480px] flex-shrink-0 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:h-screen">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 flex-shrink-0 border-b border-gray-100">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex-shrink-0" title="Go home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/roady-logo.png" alt="Roady" style={{ height: 36, width: 'auto' }} />
            </Link>
            <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
            <h1 className="font-extrabold text-base truncate" style={{ color: '#1B2D45' }}>
              Chat with Roady
            </h1>
          </div>

          {/* Right: auth nav */}
          {!authLoading && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {user ? (
                <>
                  <span className="text-xs font-semibold text-gray-400 hidden sm:block truncate max-w-[140px]">
                    {truncateEmail(user.email ?? '')}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-xs font-semibold whitespace-nowrap transition-colors text-gray-400 hover:text-red-500"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login?next=/chat"
                  className="text-xs font-semibold whitespace-nowrap transition-colors text-gray-400 hover:text-green"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Chat thread — scrollable, flex-1 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !loading ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="text-5xl mb-4">🗺️</div>
              <h2 className="text-xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>
                Hey, I&apos;m Roady
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Tell me where you want to go and I&apos;ll help plan your perfect California road trip.
                You can ask about routes, destinations, or let me build a custom itinerary.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div
                        className="max-w-[80%] px-4 py-2.5 text-sm font-medium text-white"
                        style={{
                          backgroundColor: '#58CC02',
                          borderRadius: '18px 18px 4px 18px',
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Assistant message
                const displayText = getDisplayContent(msg.content);
                const generateParams = extractGenerateParams(msg.content);

                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[80%] flex flex-col gap-2">
                      <div
                        className="px-4 py-2.5 text-sm text-gray-800 bg-white shadow-sm"
                        style={{ borderRadius: '18px 18px 18px 4px' }}
                      >
                        {displayText}
                      </div>
                      {generateParams && (
                        <button
                          onClick={() => handleGenerateClick(generateParams)}
                          disabled={generatingTrip}
                          className="self-start px-4 py-2 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                          style={{ backgroundColor: '#D85A30' }}
                        >
                          {generatingTrip ? (
                            <>
                              <span
                                className="w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0"
                                style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }}
                              />
                              Building your trip…
                            </>
                          ) : (
                            'Generate my trip →'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading indicator — three bouncing coral dots */}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-3 bg-white shadow-sm flex items-center gap-1.5"
                    style={{ borderRadius: '18px 18px 18px 4px' }}
                  >
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#D85A30',
                          animationDelay: `${delay}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input — pinned to bottom */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask Roady anything about your trip…"
              className="flex-1 bg-transparent resize-none text-sm outline-none placeholder-gray-400 text-gray-800 leading-relaxed disabled:opacity-50"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#D85A30' }}
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </aside>

      {/* ── RIGHT PANEL — Conversations ── */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto px-6 lg:px-10 py-8">
        <div className="max-w-md">
          {/* Right panel header with "New chat" button */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-extrabold" style={{ color: '#1B2D45' }}>
              Your conversations
            </h2>
            <button
              onClick={handleNewChat}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all border-2 border-coral text-coral bg-transparent hover:bg-coral hover:text-white"
            >
              + New chat
            </button>
          </div>

          {/* Auth-differentiated content */}
          {!authLoading && (
            <>
              {user ? (
                <>
                  <p className="text-sm text-gray-400 mb-6">Your chat history will appear here.</p>
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
                    <p className="text-2xl mb-2">💬</p>
                    <p className="text-sm font-semibold text-gray-500">Your past conversations will appear here</p>
                    <p className="text-xs text-gray-400 mt-1">Conversation history coming soon</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-6">Sign in to keep track of your chats.</p>
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
                    <p className="text-2xl mb-2">💬</p>
                    <p className="text-sm font-semibold text-gray-500">Sign in to save your chats</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Your conversations will be saved across sessions</p>
                    <Link
                      href="/login?next=/chat"
                      className="inline-block px-4 py-2 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#D85A30' }}
                    >
                      Sign In
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#F3F4F2' }} />}>
      <ChatContent />
    </Suspense>
  );
}
