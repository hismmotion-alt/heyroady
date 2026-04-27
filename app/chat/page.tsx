'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import { geocode } from '@/lib/geocode';
import type { User } from '@supabase/supabase-js';
import type { Message, TripData, HotelSuggestion } from '@/lib/types';

const TripPanel = dynamic(() => import('@/components/TripPanel'), { ssr: false });

// ─── Flow types ───────────────────────────────────────────────────────────────

type FlowStep =
  | 'asking_start'
  | 'asking_group' | 'asking_interests' | 'asking_enroute'
  | 'asking_spots' | 'asking_hotel' | 'asking_nights' | 'asking_date'
  | 'asking_distance'
  | 'asking_route_choice'
  | 'generating' | 'done';

type RouteOption = { id: string; name: string; tagline: string; via: string; destination: string; icon: string };

const STEP_MESSAGES: Record<FlowStep, string> = {
  asking_start:     "Hey! I'm Roady 🗺️ Let's plan your California road trip. Where are you starting from?",
  asking_group:     "Who's coming along?",
  asking_interests: "What are you into? Pick as many as you like:",
  asking_enroute:   "Any stops along the drive?",
  asking_spots:     "How many spots do you want to explore at the destination?",
  asking_hotel:        "Want hotel suggestions?",
  asking_nights:       "How many nights are you staying?",
  asking_date:         "When are you heading out? 📅",
  asking_distance:     "How far are you willing to drive? 🚗",
  asking_route_choice: "Here are 3 routes I can build for you — which vibe are you feeling?",
  generating:          "Building your perfect trip... 🚗✨",
  done:             "Here's your trip! I've mapped it all out on the right. Want to change anything?",
};

const FLOW_CHIPS: Partial<Record<FlowStep, { id: string; label: string }[]>> = {
  asking_group: [
    { id: 'solo', label: 'Solo 🎒' },
    { id: 'couple', label: 'Couple 💑' },
    { id: 'family', label: 'Family 👨‍👩‍👧' },
    { id: 'friends', label: 'Friends 👯' },
  ],
  asking_interests: [
    { id: 'nature', label: '🌿 Nature' },
    { id: 'food', label: '🍴 Food' },
    { id: 'culture', label: '🏛️ Culture' },
    { id: 'adventure', label: '🏕️ Adventure' },
    { id: 'scenic', label: '🌄 Scenic' },
  ],
  asking_enroute: [
    { id: '0', label: 'Drive straight ⚡' },
    { id: '1', label: '1 stop' },
    { id: '2', label: '2 stops' },
    { id: '3', label: '3 stops' },
  ],
  asking_spots: [
    { id: '1', label: '1 spot' },
    { id: '2', label: '2 spots' },
    { id: '3', label: '3 spots' },
    { id: '4', label: '4 spots' },
    { id: '5', label: '5 spots' },
    { id: 'auto', label: 'Roady decides ✨' },
  ],
  asking_hotel: [
    { id: '', label: 'No thanks' },
    { id: 'budget', label: 'Budget 💰' },
    { id: 'mid-range', label: 'Mid-range 💰💰' },
    { id: 'luxury', label: 'Luxury 💰💰💰' },
  ],
  asking_nights: [
    { id: '1', label: '1 night' },
    { id: '2', label: '2 nights' },
    { id: '3', label: '3 nights' },
    { id: '4+', label: '4+ nights' },
  ],
  asking_distance: [
    { id: 'under-50',  label: '< 50 miles 🏙️' },
    { id: '50-100',    label: '50–100 miles 🚗' },
    { id: '150-plus',  label: '150+ miles 🛣️' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ChatMessage = Message & { id: string };

type SavedTrip = {
  id: string;
  start: string;
  end: string;
  trip_data: TripData;
  created_at: string;
};

const CATEGORY_META: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  nature:    { emoji: '🌿', label: 'Nature',    bg: 'rgba(29,158,117,0.1)',  color: '#1D9E75' },
  food:      { emoji: '🍴', label: 'Food',      bg: 'rgba(239,159,39,0.1)', color: '#EF9F27' },
  culture:   { emoji: '🏛️', label: 'Culture',   bg: 'rgba(147,51,234,0.1)', color: '#7c3aed' },
  adventure: { emoji: '🏕️', label: 'Adventure', bg: 'rgba(216,90,48,0.1)',  color: '#D85A30' },
  scenic:    { emoji: '🌄', label: 'Scenic',    bg: 'rgba(55,138,221,0.1)', color: '#378ADD' },
};

function truncateEmail(email: string): string {
  return email.length > 22 ? email.slice(0, 19) + '…' : email;
}

// ─── Chat content ─────────────────────────────────────────────────────────────

function ChatContent() {
  const router = useRouter();

  // ── Auth ──
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

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

  useEffect(() => {
    if (!user) { setSavedTrips([]); return; }
    setTripsLoading(true);
    const supabase = createClient();
    supabase
      .from('saved_trips')
      .select('id, start, end, trip_data, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) setSavedTrips(data as SavedTrip[]);
        setTripsLoading(false);
      });
  }, [user]);

  // ── Chat / flow state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [flowStep, setFlowStep] = useState<FlowStep>('asking_start');
  const [tripPrefs, setTripPrefs] = useState({
    start: '', end: '',
    travelGroup: '',
    interests: [] as string[],
    numberOfEnrouteStops: '0',
    numberOfStops: '',
    hotelPreference: '',
    hotelNights: '',
    travelDate: '',
    distance: '',
  });
  const [routeOptions, setRouteOptions] = useState<RouteOption[] | null>(null);
  const [datePickerValue, setDatePickerValue] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState<TripData | null>(null);
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [customInputStep, setCustomInputStep] = useState<FlowStep | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelSuggestion | null>(null);
  const [tripSaved, setTripSaved] = useState(false);
  const [tripSaving, setTripSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  // Always holds the latest state so saveStateAndGoSignIn never captures a stale closure
  const chatStateRef = useRef({ messages, flowStep, tripPrefs, generatedTrip, startCoords, endCoords, routeOptions, selectedInterests });
  useEffect(() => {
    chatStateRef.current = { messages, flowStep, tripPrefs, generatedTrip, startCoords, endCoords, routeOptions, selectedInterests };
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Save state to localStorage then navigate to sign-in
  function saveStateAndGoSignIn() {
    try {
      localStorage.setItem('roady_chat_state', JSON.stringify(chatStateRef.current));
    } catch { /* ignore */ }
    router.push('/login?next=/chat');
  }

  // Initial greeting — restore from localStorage if returning after sign-in
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const saved = localStorage.getItem('roady_chat_state');
      if (saved) {
        const s = JSON.parse(saved);
        localStorage.removeItem('roady_chat_state');
        if (s.messages?.length)      setMessages(s.messages);
        if (s.flowStep)              setFlowStep(s.flowStep);
        if (s.tripPrefs)             setTripPrefs(s.tripPrefs);
        if (s.generatedTrip)         setGeneratedTrip(s.generatedTrip);
        if (s.startCoords)           setStartCoords(s.startCoords);
        if (s.endCoords)             setEndCoords(s.endCoords);
        if (s.routeOptions)          setRouteOptions(s.routeOptions);
        if (s.selectedInterests)     setSelectedInterests(s.selectedInterests);
        return;
      }
    } catch { /* ignore */ }
    setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: STEP_MESSAGES.asking_start }]);
  }, []);

  function appendMessage(role: 'user' | 'assistant', content: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content }]);
  }

  function advanceTo(next: FlowStep) {
    setFlowStep(next);
    appendMessage('assistant', STEP_MESSAGES[next]);
  }

  // ── Free-form chat (used after trip is generated) ──
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
      setMessages([...msgs, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || 'Sorry, something went wrong.',
      }]);
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

  // ── Route options (step before full generation) ──
  async function generateRouteOptions(prefs: typeof tripPrefs) {
    setFlowStep('generating');
    appendMessage('assistant', "Let me think up some great routes for you... 🗺️");
    try {
      const res = await fetch('/api/suggest-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: prefs.start,
          distance: prefs.distance,
          travelGroup: prefs.travelGroup,
          interests: prefs.interests.join(','),
          numberOfEnrouteStops: prefs.numberOfEnrouteStops,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch options');
      const options: RouteOption[] = await res.json();
      setRouteOptions(options);
      setFlowStep('asking_route_choice');
      appendMessage('assistant', STEP_MESSAGES.asking_route_choice);
    } catch {
      appendMessage('assistant', "Hmm, something went wrong. Want to try again?");
      setFlowStep('asking_start');
    }
  }

  // ── Full trip generation ──
  async function generateTrip(prefs: typeof tripPrefs, routeHint: string) {
    setFlowStep('generating');
    appendMessage('assistant', STEP_MESSAGES.generating);
    try {
      const [sc, ec] = await Promise.all([geocode(prefs.start), geocode(prefs.end)]);
      setStartCoords(sc);
      setEndCoords(ec);
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: prefs.start,
          end: prefs.end,
          travelGroup: prefs.travelGroup,
          stopTypes: prefs.interests.join(','),
          numberOfEnrouteStops: prefs.numberOfEnrouteStops,
          numberOfStops: prefs.numberOfStops,
          hotelPreference: prefs.hotelPreference,
          hotelNights: prefs.hotelNights,
          travelDate: prefs.travelDate,
          routeHint,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate trip');
      const tripData: TripData = await res.json();
      setGeneratedTrip(tripData);
      setFlowStep('done');
      appendMessage('assistant', STEP_MESSAGES.done);
    } catch {
      appendMessage('assistant', "Hmm, something went wrong. Want to try again?");
      setFlowStep('asking_start');
    }
  }

  // ── Chip selection ──
  function handleChipSelect(step: FlowStep, id: string, label: string) {
    if (id === '__custom__') {
      setCustomInputStep(step);
      return;
    }
    appendMessage('user', label);
    if (step === 'asking_group') {
      setTripPrefs((p) => ({ ...p, travelGroup: id }));
      advanceTo('asking_interests');
    } else if (step === 'asking_enroute') {
      setTripPrefs((p) => ({ ...p, numberOfEnrouteStops: id }));
      advanceTo('asking_spots');
    } else if (step === 'asking_spots') {
      setTripPrefs((p) => ({ ...p, numberOfStops: id }));
      advanceTo('asking_hotel');
    } else if (step === 'asking_hotel') {
      setTripPrefs((p) => ({ ...p, hotelPreference: id }));
      if (id === '') {
        advanceTo('asking_distance');
      } else {
        advanceTo('asking_nights');
      }
    } else if (step === 'asking_nights') {
      setTripPrefs((p) => ({ ...p, hotelNights: id }));
      advanceTo('asking_date');
    } else if (step === 'asking_distance') {
      const finalPrefs = { ...tripPrefs, distance: id };
      setTripPrefs(finalPrefs);
      generateRouteOptions(finalPrefs);
    }
  }

  function handleInterestConfirm() {
    const labels = selectedInterests
      .map((id) => FLOW_CHIPS.asking_interests!.find((c) => c.id === id)?.label ?? id)
      .join(', ');
    appendMessage('user', labels || 'Any vibe');
    setTripPrefs((p) => ({ ...p, interests: selectedInterests }));
    setSelectedInterests([]);
    advanceTo('asking_enroute');
  }

  // ── Custom text input for chip steps ──
  function handleCustomInput(step: FlowStep, text: string) {
    if (step === 'asking_group') {
      setTripPrefs((p) => ({ ...p, travelGroup: text }));
      advanceTo('asking_interests');
    } else if (step === 'asking_interests') {
      setTripPrefs((p) => ({ ...p, interests: [text] }));
      setSelectedInterests([]);
      advanceTo('asking_enroute');
    } else if (step === 'asking_enroute') {
      setTripPrefs((p) => ({ ...p, numberOfEnrouteStops: text }));
      advanceTo('asking_spots');
    } else if (step === 'asking_spots') {
      setTripPrefs((p) => ({ ...p, numberOfStops: text }));
      advanceTo('asking_hotel');
    } else if (step === 'asking_hotel') {
      setTripPrefs((p) => ({ ...p, hotelPreference: text }));
      advanceTo('asking_nights');
    } else if (step === 'asking_nights') {
      setTripPrefs((p) => ({ ...p, hotelNights: text }));
      advanceTo('asking_date');
    } else if (step === 'asking_date') {
      setTripPrefs((p) => ({ ...p, travelDate: text }));
      advanceTo('asking_distance');
    } else if (step === 'asking_distance') {
      const finalPrefs = { ...tripPrefs, distance: text };
      setTripPrefs(finalPrefs);
      generateRouteOptions(finalPrefs);
    }
  }

  // ── Date picker confirm ──
  function handleDateConfirm() {
    if (!datePickerValue) return;
    const display = new Date(datePickerValue + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    appendMessage('user', display);
    setTripPrefs((p) => ({ ...p, travelDate: datePickerValue }));
    setDatePickerValue('');
    advanceTo('asking_distance');
  }

  // ── Use current location ──
  async function handleUseLocation() {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=place,address&limit=1&access_token=${token}`
      );
      if (!res.ok) throw new Error('geocode failed');
      const json = await res.json();
      const placeName = json.features?.[0]?.place_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setInput(placeName);
    } catch {
      // silently ignore — user can type manually
    } finally {
      setLocationLoading(false);
    }
  }

  // ── Text input (start, custom chip override, and post-generation free chat) ──
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    appendMessage('user', trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (customInputStep) {
      const step = customInputStep;
      setCustomInputStep(null);
      handleCustomInput(step, trimmed);
      return;
    }

    if (flowStep === 'asking_start') {
      setLoading(true);
      fetch('/api/roady-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'asking_start', message: trimmed, prefs: tripPrefs }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.action === 'proceed' && data.start) {
            // Apply all extracted prefs at once
            setTripPrefs((p) => ({
              ...p,
              start: data.start,
              ...(data.end && { end: data.end }),
              ...(data.travelGroup && { travelGroup: data.travelGroup }),
              ...(data.interests?.length && { interests: data.interests }),
              ...(data.distance && { distance: data.distance }),
            }));
            if (data.interests?.length) setSelectedInterests(data.interests);

            // Show acknowledgement if provided
            if (data.acknowledgement) appendMessage('assistant', data.acknowledgement);

            // Advance to the first step that still needs an answer
            if (data.travelGroup && data.interests?.length) {
              advanceTo('asking_enroute');
            } else if (data.travelGroup) {
              advanceTo('asking_interests');
            } else {
              advanceTo('asking_group');
            }
          } else if (data.action === 'respond' && data.message) {
            appendMessage('assistant', data.message);
          } else {
            // fallback: treat as plain location
            setTripPrefs((p) => ({ ...p, start: trimmed }));
            advanceTo('asking_group');
          }
        })
        .catch(() => {
          setTripPrefs((p) => ({ ...p, start: trimmed }));
          advanceTo('asking_group');
        })
        .finally(() => setLoading(false));
    } else if (flowStep === 'done') {
      const newMsgs: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: trimmed }];
      sendToRoadyOrModify(newMsgs, trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  // ── Dynamic trip modification + free-form chat ──
  async function sendToRoadyOrModify(msgs: ChatMessage[], userMessage: string) {
    setLoading(true);
    try {
      if (generatedTrip) {
        const res = await fetch('/api/modify-trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            tripData: generatedTrip,
            start: tripPrefs.start,
            end: tripPrefs.end,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.action === 'modify' && data.tripData) {
            setGeneratedTrip(data.tripData);
            appendMessage('assistant', "Done! I've updated your trip. Take a look at the changes on the right. 🗺️");
            return;
          }
          if (data.action === 'respond' && data.message) {
            appendMessage('assistant', data.message);
            return;
          }
        }
      }
      // Fallback to general chat
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      });
      if (!chatRes.ok) throw new Error('chat failed');
      const chatData = await chatRes.json();
      appendMessage('assistant', chatData.content || 'Sorry, something went wrong.');
    } catch {
      appendMessage('assistant', 'Sorry, I had trouble connecting. Try again?');
    } finally {
      setLoading(false);
    }
  }

  // ── Hotel selection ──
  async function handleHotelSelect(hotel: HotelSuggestion) {
    setSelectedHotel(hotel);
    if (hotel.lat && hotel.lng) {
      setEndCoords([hotel.lat, hotel.lng]);
    } else {
      const coords = await geocode(`${hotel.name}, ${hotel.city}`);
      if (coords) setEndCoords(coords);
    }
    setTripPrefs((p) => ({ ...p, end: `${hotel.name}, ${hotel.city}` }));
  }

  // ── Save trip ──
  async function handleSaveTrip() {
    if (!user || !generatedTrip || tripSaving) return;
    setTripSaving(true);
    try {
      const res = await fetch('/api/save-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: tripPrefs.start, end: tripPrefs.end, trip_data: generatedTrip }),
      });
      if (res.ok) setTripSaved(true);
    } finally {
      setTripSaving(false);
    }
  }

  // Rendering helpers
  const chips = FLOW_CHIPS[flowStep] ?? null;
  const isInterestStep = flowStep === 'asking_interests';
  const showTextInput = flowStep === 'asking_start' || flowStep === 'done' || customInputStep !== null;

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
      style={{ backgroundColor: '#F3F4F2' }}
    >
      {/* ── LEFT PANEL — Chat ── */}
      <aside className="w-full lg:w-[480px] flex-shrink-0 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:h-screen">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 flex-shrink-0 border-b border-gray-100">
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
                <button
                  onClick={saveStateAndGoSignIn}
                  className="text-xs font-semibold whitespace-nowrap transition-colors text-gray-400 hover:text-green"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end message-in">
                  <div
                    className="max-w-[80%] px-4 py-2.5 text-sm font-medium text-white"
                    style={{ backgroundColor: '#58CC02', borderRadius: '18px 18px 4px 18px' }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex justify-start items-end gap-2 message-in">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0"
                  style={{ backgroundColor: '#D85A30' }}
                >
                  R
                </div>
                <div
                  className="max-w-[75%] px-4 py-2.5 text-sm text-gray-800"
                  style={{ backgroundColor: '#E9E9EB', borderRadius: '18px 18px 18px 4px' }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Loading dots */}
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
                    style={{ backgroundColor: '#D85A30', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Route option cards */}
        {flowStep === 'asking_route_choice' && routeOptions && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {routeOptions.map((opt, idx) => {
                const cardColors = [
                  { bg: '#D85A30', light: 'rgba(216,90,48,0.12)' },
                  { bg: '#378ADD', light: 'rgba(55,138,221,0.12)' },
                  { bg: '#1D9E75', light: 'rgba(29,158,117,0.12)' },
                ];
                const color = cardColors[idx % cardColors.length];
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      appendMessage('user', opt.name);
                      const prefsWithEnd = { ...tripPrefs, end: opt.destination };
                      setTripPrefs(prefsWithEnd);
                      generateTrip(prefsWithEnd, opt.name);
                    }}
                    className="flex-shrink-0 flex flex-col items-center text-center rounded-2xl p-3 transition-all hover:scale-105 hover:shadow-md"
                    style={{ width: 120, minHeight: 120, backgroundColor: color.light, border: `2px solid ${color.bg}20` }}
                  >
                    <span className="text-3xl mb-2">{opt.icon || '🗺️'}</span>
                    <p className="text-xs font-extrabold leading-tight mb-1" style={{ color: '#1B2D45' }}>{opt.name}</p>
                    <p className="text-[10px] font-semibold" style={{ color: color.bg }}>📍 {opt.destination}</p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => generateRouteOptions(tripPrefs)}
              className="mt-2 w-full py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
            >
              Suggest new destinations ↻
            </button>
          </div>
        )}

        {/* Calendar date picker for asking_date */}
        {flowStep === 'asking_date' && !customInputStep && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
            <input
              type="date"
              value={datePickerValue}
              onChange={(e) => setDatePickerValue(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-medium text-gray-800 mb-3 focus:outline-none"
              style={{ borderColor: datePickerValue ? '#D85A30' : '#e5e7eb' }}
            />
            <button
              onClick={handleDateConfirm}
              disabled={!datePickerValue}
              className="w-full py-2 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#D85A30' }}
            >
              Set date →
            </button>
          </div>
        )}

        {/* Chips — single-select (group, enroute, spots, hotel, nights, distance) */}
        {chips && !isInterestStep && !customInputStep && flowStep !== 'asking_route_choice' && flowStep !== 'asking_date' && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleChipSelect(flowStep, chip.id, chip.label)}
                className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all hover:border-[#D85A30] hover:text-[#D85A30] hover:bg-[rgba(216,90,48,0.05)]"
                style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
              >
                {chip.label}
              </button>
            ))}
            <button
              onClick={() => handleChipSelect(flowStep, '__custom__', '')}
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all hover:border-[#378ADD] hover:text-[#378ADD] hover:bg-[rgba(55,138,221,0.05)]"
              style={{ borderColor: '#e5e7eb', color: '#9ca3af', backgroundColor: 'white' }}
            >
              Tell me more ✍️
            </button>
          </div>
        )}

        {/* Chips — multi-select interests */}
        {isInterestStep && !customInputStep && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 mb-3">
              {FLOW_CHIPS.asking_interests!.map((chip) => {
                const selected = selectedInterests.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedInterests((prev) =>
                      selected ? prev.filter((i) => i !== chip.id) : [...prev, chip.id]
                    )}
                    className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
                    style={{
                      borderColor: selected ? '#D85A30' : '#e5e7eb',
                      backgroundColor: selected ? 'rgba(216,90,48,0.08)' : 'white',
                      color: selected ? '#D85A30' : '#374151',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
              <button
                onClick={() => setCustomInputStep('asking_interests')}
                className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all hover:border-[#378ADD] hover:text-[#378ADD] hover:bg-[rgba(55,138,221,0.05)]"
                style={{ borderColor: '#e5e7eb', color: '#9ca3af', backgroundColor: 'white' }}
              >
                Tell me more ✍️
              </button>
            </div>
            <button
              onClick={handleInterestConfirm}
              className="w-full py-2 rounded-xl font-bold text-sm text-white transition-opacity"
              style={{ backgroundColor: '#D85A30', opacity: selectedInterests.length === 0 ? 0.5 : 1 }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Text input */}
        {showTextInput && (
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
            {flowStep === 'asking_start' && (
              <div className="mb-2">
                <button
                  onClick={handleUseLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-[#D85A30] hover:text-[#D85A30] transition-colors disabled:opacity-50"
                >
                  {locationLoading ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                  )}
                  {locationLoading ? 'Detecting…' : 'Use my current location'}
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder={
                  customInputStep ? 'Type your answer…' :
                  flowStep === 'asking_start' ? 'e.g. San Francisco…' :
                  'Ask Roady anything about your trip…'
                }
                className="flex-1 bg-transparent resize-none text-sm outline-none placeholder-gray-400 text-gray-800 leading-relaxed disabled:opacity-50"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#D85A30' }}
                aria-label="Send"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
            {flowStep === 'done' && (
              <p className="text-[11px] text-gray-400 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
            )}
          </div>
        )}
      </aside>

      {/* ── RIGHT PANEL — Saved Trips + Generated Trip ── */}
      <main className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden">

        {/* Saved trips section */}
        <div
          className="overflow-y-auto px-6 py-6 flex-shrink-0"
          style={{ maxHeight: generatedTrip ? '40%' : undefined, flex: generatedTrip ? undefined : '1' }}
        >
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold" style={{ color: '#1B2D45' }}>Your saved trips</h2>
              <button
                onClick={() => {
                  setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: STEP_MESSAGES.asking_start }]);
                  setFlowStep('asking_start');
                  setTripPrefs({ start: '', end: '', travelGroup: '', interests: [], numberOfEnrouteStops: '0', numberOfStops: '', hotelPreference: '', hotelNights: '', travelDate: '', distance: '' });
                  setSelectedInterests([]);
                  setGeneratedTrip(null);
                  setStartCoords(null);
                  setEndCoords(null);
                  setRouteOptions(null);
                  setDatePickerValue('');
                  setInput('');
                  setSelectedHotel(null);
                  setTripSaved(false);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all border-2 border-coral text-coral bg-transparent hover:bg-coral hover:text-white"
              >
                + New chat
              </button>
            </div>

            {!authLoading && (
              <>
                {!user && (
                  <>
                    <p className="text-sm text-gray-400 mb-6">Sign in to save trips Roady suggests.</p>
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
                      <p className="text-2xl mb-2">🗺️</p>
                      <p className="text-sm font-semibold text-gray-500 mb-1">Sign in to save trips</p>
                      <p className="text-xs text-gray-400 mb-4">Trips you generate will appear here</p>
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

                {user && tripsLoading && (
                  <div className="flex flex-col gap-3 mt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {user && !tripsLoading && savedTrips.length === 0 && (
                  <>
                    <p className="text-sm text-gray-400 mb-6">Trips Roady builds for you will be saved here.</p>
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
                      <p className="text-2xl mb-2">🗺️</p>
                      <p className="text-sm font-semibold text-gray-500">No saved trips yet</p>
                      <p className="text-xs text-gray-400 mt-1">Ask Roady to build a trip and save it here</p>
                    </div>
                  </>
                )}

                {user && !tripsLoading && savedTrips.length > 0 && (
                  <>
                    <p className="text-sm text-gray-400 mb-4">Pick up where you left off.</p>
                    <div className="flex flex-col gap-4">
                      {savedTrips.map((trip) => {
                        const completed = !!trip.trip_data.completed;
                        const vibeCategories = trip.trip_data.stops
                          .map((s) => s.category)
                          .filter((cat, idx, arr) => arr.indexOf(cat) === idx);
                        return (
                          <div
                            key={trip.id}
                            className="rounded-2xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-all"
                            style={{
                              backgroundColor: completed ? '#f0fce4' : '#ffffff',
                              border: completed ? '1.5px solid rgba(88,204,2,0.35)' : '1.5px solid #f0f0f0',
                            }}
                          >
                            <div>
                              <p className="text-xs text-gray-400 mb-1">
                                {new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <h3 className="font-extrabold text-sm mb-0.5" style={{ color: '#1B2D45' }}>
                                {trip.trip_data.routeName}
                              </h3>
                              <p className="text-xs text-gray-400 mb-2">
                                🚗 {trip.start} → 🏁 {trip.end}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(216,90,48,0.08)', color: '#D85A30' }}>
                                  📍 {trip.trip_data.stops.length} stop{trip.trip_data.stops.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(55,138,221,0.08)', color: '#378ADD' }}>
                                  🛣 {trip.trip_data.totalMiles} mi
                                </span>
                                {completed && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(88,204,2,0.15)', color: '#46a302' }}>
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                              {vibeCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {vibeCategories.map((cat) => {
                                    const meta = CATEGORY_META[cat];
                                    if (!meta) return null;
                                    return (
                                      <span key={cat} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>
                                        {meta.emoji} {meta.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => router.push(`/saved/${trip.id}`)}
                              className="w-full py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                              style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
                            >
                              View trip →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Generated trip panel */}
        {generatedTrip && startCoords && endCoords && (
          <div className="flex-1 min-h-0 px-4 pb-4 pt-0 flex gap-3">
            {/* Trip card */}
            <div className="flex-1 min-h-0 min-w-0">
              <TripPanel
                tripData={generatedTrip}
                start={tripPrefs.start}
                end={tripPrefs.end}
                startCoords={startCoords}
                endCoords={endCoords}
                isSaved={tripSaved}
                onSave={user ? handleSaveTrip : undefined}
                onSignIn={!user ? saveStateAndGoSignIn : undefined}
              />
            </div>

            {/* Hotels panel */}
            {generatedTrip.hotels && generatedTrip.hotels.length > 0 && (
              <div className="flex-1 flex-shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#993C1D' }}>Hotel options</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tap to update destination</p>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                  {generatedTrip.hotels.map((hotel, i) => {
                    const isSelected = selectedHotel?.name === hotel.name;
                    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`;
                    return (
                      <div
                        key={i}
                        onClick={() => handleHotelSelect(hotel)}
                        className="w-full text-left rounded-lg p-2.5 border-2 transition-all hover:border-[#D85A30] cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#D85A30' : '#f0f0f0',
                          backgroundColor: isSelected ? 'rgba(216,90,48,0.04)' : 'white',
                        }}
                      >
                        {hotel.fsqPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hotel.fsqPhoto} alt={hotel.name} className="w-full h-20 object-cover rounded-md mb-2" />
                        ) : (
                          <div className="w-full h-16 rounded-md mb-2 flex items-center justify-center bg-gray-50">
                            <span className="text-2xl">🏨</span>
                          </div>
                        )}
                        <p className="text-xs font-bold leading-tight" style={{ color: '#1B2D45' }}>{hotel.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{hotel.city}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold" style={{ color: '#D85A30' }}>{hotel.priceRange}</span>
                          {hotel.fsqRating && (
                            <span className="text-[10px] text-gray-400">⭐ {hotel.fsqRating.toFixed(1)}</span>
                          )}
                        </div>
                        {isSelected && (
                          <p className="text-[9px] font-bold mt-1" style={{ color: '#D85A30' }}>✓ Destination updated</p>
                        )}
                        <a
                          href={bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#003580' }}
                        >
                          Book on Booking.com
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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
