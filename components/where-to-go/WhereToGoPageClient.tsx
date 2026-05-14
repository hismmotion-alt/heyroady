'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import Navbar from '@/components/Navbar';
import {
  WHERE_TO_GO_DESTINATIONS,
  WHERE_TO_GO_TAGS,
  type WhereToGoDestination,
  type WhereToGoTag,
} from '@/lib/where-to-go';

type ActiveFilter = 'all' | WhereToGoTag;
const DESTINATIONS_PER_SLIDE = 6;

const CATEGORY_STYLES: Record<WhereToGoDestination['categoryColor'], string> = {
  coral: 'bg-[#EC501E] text-white',
  green: 'bg-[#35BA54] text-white',
  gold: 'bg-[#F5A400] text-white',
  purple: 'bg-[#7B5AC8] text-white',
};

function TagIcon({ id }: { id: WhereToGoTag }) {
  const baseClass = 'h-8 w-8';

  if (id === 'scenic-routes') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 32 32">
        <path d="M4 24 12 9l6 10 3-5 7 10H4Z" />
        <path d="m8 11 2-2 2 2" />
        <path d="M22 7h3v3" />
        <path d="M25 7 20 12" />
      </svg>
    );
  }

  if (id === 'local-charm') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 32 32">
        <path d="M5 26h22" />
        <path d="M8 26V11l6-4v19" />
        <path d="M18 26V13h8v13" />
        <path d="M10.5 15h2M10.5 20h2M21 17h2M21 22h2" />
        <path d="M18 13l4-4 4 4" />
      </svg>
    );
  }

  if (id === 'photo-worthy') {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 32 32">
        <path d="M7 11h5l2-3h4l2 3h5v14H7V11Z" />
        <circle cx="16" cy="18" r="4.5" />
        <path d="M23 14h.01" />
      </svg>
    );
  }

  return (
    <svg className={baseClass} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 32 32">
      <path d="M9 7v8" />
      <path d="M6 7v8" />
      <path d="M12 7v8c0 2-1.3 3.5-3 4v6" />
      <path d="M22 7v18" />
      <path d="M19 7c4 1 6 4 5 9-1 3-2.5 4-5 4" />
    </svg>
  );
}

function DestinationCard({ destination, onPlan }: { destination: WhereToGoDestination; onPlan: () => void }) {
  return (
    <article
      className="group flex min-h-[318px] flex-col overflow-hidden rounded-[22px] border border-[#E6E8EF] bg-white shadow-[0_14px_34px_rgba(20,16,70,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(20,16,70,0.14)]"
    >
      <button type="button" onClick={onPlan} className="relative h-[132px] overflow-hidden text-left">
        <img
          src={destination.image}
          alt={destination.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          data-destination-image
        />
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm ${CATEGORY_STYLES[destination.categoryColor]}`}>
          {destination.category}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={onPlan} className="text-left">
          <h2 className="text-[21px] font-extrabold leading-tight text-[#141046] transition-colors group-hover:text-[#EC501E]">
            {destination.name}
          </h2>
        </button>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#6F7285]">
          <svg className="h-4 w-4 text-[#141046]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {destination.region}
        </p>
        <p className="mt-3 line-clamp-3 flex-1 text-[14px] font-medium leading-6 text-[#6F7285]">
          {destination.description}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onPlan}
            className="rounded-full border border-[#DDE1EA] px-4 py-2 text-sm font-extrabold text-[#141046] transition-all duration-300 hover:border-[#25AB45] hover:bg-[#25AB45] hover:text-white"
          >
            Plan this trip
          </button>
        </div>
      </div>
    </article>
  );
}

export default function WhereToGoPageClient() {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [activeSlide, setActiveSlide] = useState(0);

  const destinations = useMemo(() => {
    if (activeFilter === 'all') return WHERE_TO_GO_DESTINATIONS;
    return WHERE_TO_GO_DESTINATIONS.filter((destination) => destination.tags.includes(activeFilter));
  }, [activeFilter]);
  const totalSlides = Math.max(1, Math.ceil(destinations.length / DESTINATIONS_PER_SLIDE));
  const visibleDestinations = destinations.slice(
    activeSlide * DESTINATIONS_PER_SLIDE,
    activeSlide * DESTINATIONS_PER_SLIDE + DESTINATIONS_PER_SLIDE
  );

  useEffect(() => {
    setActiveSlide(0);
  }, [activeFilter]);

  useEffect(() => {
    if (!gridRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-destination-card]');
      const images = gsap.utils.toArray<HTMLElement>('[data-destination-image]');

      gsap.fromTo(
        cards,
        { autoAlpha: 0, x: 42, y: 16, scale: 0.985 },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.72,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.08,
        }
      );

      gsap.fromTo(
        images,
        { xPercent: 8, scale: 1.08 },
        {
          xPercent: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.12,
        }
      );
    }, gridRef);

    return () => context.revert();
  }, [activeSlide, activeFilter]);

  function goToPreviousSlide() {
    setActiveSlide((current) => Math.max(0, current - 1));
  }

  function goToNextSlide() {
    setActiveSlide((current) => Math.min(totalSlides - 1, current + 1));
  }

  function startDestinationFlow(destination: WhereToGoDestination) {
    const params = new URLSearchParams({
      source: 'where-to-go',
      destination: destination.slug,
    });
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar primaryLabel="Start planning" signedInPrimaryLabel="Start planning" />

      <main className="overflow-hidden pt-16">
        <section className="relative bg-white px-6 py-12 sm:py-16 lg:min-h-[720px] lg:px-10 xl:px-12">
          <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[430px_minmax(0,1fr)] xl:grid-cols-[470px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="inline-flex rounded-[8px] bg-[#EC501E] px-4 py-2 text-sm font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_10px_28px_rgba(236,80,30,0.2)]">
                Roady picks
              </div>

              <h1 className="mt-7 max-w-[430px] text-[52px] font-extrabold leading-[0.98] tracking-[-0.02em] text-[#141046] sm:text-[64px]">
                Where to go
              </h1>
              <p className="mt-5 max-w-[430px] text-[18px] font-medium leading-8 text-[#6F7285]">
                Handpicked places, scenic stops, and unforgettable destinations for your California road trip.
              </p>

              <div className="mt-8 hidden sm:block">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`rounded-full border px-5 py-2.5 text-sm font-extrabold transition-all duration-300 ${
                    activeFilter === 'all'
                      ? 'border-[#25AB45] bg-[#25AB45] text-white shadow-[0_16px_34px_rgba(37,171,69,0.16)]'
                      : 'border-[#DDE1EA] bg-white text-[#141046] shadow-sm hover:border-[#25AB45]'
                  }`}
                >
                  All destinations
                </button>

                <div className="mt-8 grid grid-cols-4 gap-5">
                  {WHERE_TO_GO_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setActiveFilter(tag.id)}
                      className="group text-center"
                    >
                      <span
                        className={`mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-[18px] border transition-all duration-300 group-hover:-translate-y-1 ${
                          activeFilter === tag.id
                            ? 'border-[#25AB45] shadow-[0_16px_30px_rgba(37,171,69,0.18)]'
                            : 'border-transparent shadow-[0_12px_24px_rgba(20,16,70,0.06)]'
                        }`}
                        style={{ color: tag.color, backgroundColor: tag.bg }}
                      >
                        <TagIcon id={tag.id} />
                      </span>
                      <span className="mt-4 block text-sm font-extrabold text-[#141046]">{tag.label}</span>
                      <span className="mt-2 block text-[13px] font-medium leading-5 text-[#6F7285]">{tag.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 flex gap-3 overflow-x-auto pb-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-extrabold ${
                    activeFilter === 'all' ? 'border-[#25AB45] bg-[#25AB45] text-white' : 'border-[#DDE1EA] bg-white text-[#141046]'
                  }`}
                >
                  All
                </button>
                {WHERE_TO_GO_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setActiveFilter(tag.id)}
                    className={`shrink-0 rounded-full border px-5 py-3 text-sm font-extrabold ${
                      activeFilter === tag.id ? 'border-[#25AB45] bg-[#25AB45] text-white' : 'border-[#DDE1EA] bg-white text-[#141046]'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              <div className="mb-6 hidden items-center justify-between gap-4 sm:flex">
                <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#EC501E]">
                  Showing {visibleDestinations.length} of {destinations.length} destination{destinations.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="rounded-full border border-[#DDE1EA] bg-white px-5 py-3 text-sm font-extrabold text-[#141046] shadow-sm transition-colors hover:border-[#25AB45]"
                >
                  All Types
                </button>
              </div>

              <div ref={gridRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleDestinations.map((destination) => (
                  <div key={destination.id} data-destination-card>
                    <DestinationCard
                      destination={destination}
                      onPlan={() => startDestinationFlow(destination)}
                    />
                  </div>
                ))}
              </div>

              {totalSlides > 1 && (
                <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalSlides }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        aria-label={`Show destination slide ${index + 1}`}
                        className={`h-2.5 rounded-full transition-all ${
                          activeSlide === index ? 'w-8 bg-[#25AB45]' : 'w-2.5 bg-[#DDE1EA] hover:bg-[#AEB8C8]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <button
                      type="button"
                      onClick={goToPreviousSlide}
                      disabled={activeSlide === 0}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-[#DDE1EA] bg-white px-5 text-sm font-extrabold text-[#141046] transition-all hover:border-[#25AB45] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={goToNextSlide}
                      disabled={activeSlide === totalSlides - 1}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#25AB45] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,171,69,0.16)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
