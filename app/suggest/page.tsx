'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const QUESTIONS = [
  {
    id: 'travelStyle',
    question: 'How do you like to travel?',
    type: 'single' as const,
    options: ['Solo', 'Couple', 'Family', 'Friends'],
  },
  {
    id: 'interests',
    question: 'What are you interested in?',
    type: 'multi' as const,
    options: ['Nature', 'Food', 'Culture', 'Adventure', 'Beaches'],
  },
  {
    id: 'vibe',
    question: "What's your trip vibe?",
    type: 'single' as const,
    options: ['Relaxed', 'Mixed', 'Adventurous'],
  },
  {
    id: 'days',
    question: 'How many days is your trip?',
    type: 'number' as const,
    options: [],
  },
  {
    id: 'distance',
    question: 'How far are you willing to drive?',
    type: 'single' as const,
    options: ['~50 miles', '50–100 miles', '200+ miles'],
  },
];

type Answers = {
  travelStyle: string;
  interests: string[];
  vibe: string;
  days: string;
  distance: string;
};

function SuggestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get('start') || '';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    travelStyle: '',
    interests: [],
    vibe: '',
    days: '',
    distance: '',
  });

  if (!start) {
    router.push('/');
    return null;
  }

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const isAnswered = (() => {
    if (question.type === 'multi') return answers.interests.length > 0;
    if (question.type === 'number') return answers.days.trim() !== '' && Number(answers.days) >= 1;
    return (answers[question.id as keyof Omit<Answers, 'interests'>] as string) !== '';
  })();

  function handleSingle(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value.toLowerCase() }));
  }

  function handleMulti(value: string) {
    const lower = value.toLowerCase();
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(lower)
        ? prev.interests.filter((i) => i !== lower)
        : [...prev.interests, lower],
    }));
  }

  function handleNext() {
    if (isLast) {
      const params = new URLSearchParams({
        start,
        travelStyle: answers.travelStyle,
        interests: answers.interests.join(','),
        vibe: answers.vibe,
        days: answers.days,
        distance: answers.distance,
      });
      router.push(`/suggestions?${params.toString()}`);
    } else {
      setStep((s) => s + 1);
    }
  }

  const currentSingleAnswer =
    question.id !== 'interests' && question.type !== 'number'
      ? (answers[question.id as keyof Omit<Answers, 'interests'>] as string)
      : '';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="h-16 flex items-center px-6 border-b"
        style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.06)' }}
      >
        <button onClick={() => router.push('/')}>
          <img src="/roady-logo.png" alt="Roady" style={{ height: 56, width: 'auto' }} />
        </button>
      </nav>

      {/* Progress bar */}
      <div className="w-full px-6 pt-8">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 mb-2">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i <= step ? '#58CC02' : '#E5E7EB' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <h2
            className="text-2xl sm:text-3xl font-extrabold mb-8"
            style={{ color: '#1B2D45' }}
          >
            {question.question}
          </h2>

          {/* Single-select */}
          {question.type === 'single' && (
            <div className="flex flex-wrap gap-3">
              {question.options.map((opt) => {
                const selected = currentSingleAnswer === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSingle(opt)}
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: selected ? '#58CC02' : 'white',
                      color: selected ? '#ffffff' : '#1B2D45',
                      border: selected ? 'none' : '2px solid #E5E7EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-select */}
          {question.type === 'multi' && (
            <div className="flex flex-wrap gap-3">
              {question.options.map((opt) => {
                const selected = answers.interests.includes(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleMulti(opt)}
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      backgroundColor: selected ? '#58CC02' : 'white',
                      color: selected ? '#ffffff' : '#1B2D45',
                      border: selected ? 'none' : '2px solid #E5E7EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Number input */}
          {question.type === 'number' && (
            <input
              type="number"
              placeholder="e.g. 3"
              value={answers.days}
              onChange={(e) => setAnswers((prev) => ({ ...prev, days: e.target.value }))}
              min="1"
              className="px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#58CC02]"
              style={{ width: '120px', fontSize: '18px' }}
            />
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-10">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-6 py-4 rounded-xl font-bold text-sm"
                style={{ border: '2px solid #E5E7EB', color: '#6B7280', backgroundColor: 'white' }}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isAnswered}
              className="flex-1 px-8 py-4 rounded-xl font-bold text-base text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#58CC02' }}
            >
              {isLast ? 'Find My Destination →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#ffffff' }} />}>
      <SuggestContent />
    </Suspense>
  );
}
