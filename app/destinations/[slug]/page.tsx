// app/destinations/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { compileMDX } from 'next-mdx-remote/rsc';
import matter from 'gray-matter';
import Navbar from '@/components/Navbar';
import FeaturedStop from '@/components/route/FeaturedStop';
import FactBox from '@/components/route/FactBox';
import HiddenGems from '@/components/route/HiddenGems';
import RouteSummary from '@/components/route/RouteSummary';
import { getAllSlugs, getRouteRaw } from '@/lib/routes';
import type { RouteFrontmatter } from '@/lib/route-types';

const mdxComponents = { FeaturedStop, FactBox, HiddenGems, RouteSummary };

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const raw = getRouteRaw(params.slug);
    const { data } = matter(raw);
    const frontmatter = data as RouteFrontmatter;
    return {
      title: `${frontmatter.title} Road Trip Guide | Roady`,
      description: frontmatter.metaDescription,
      keywords: frontmatter.metaKeywords,
    };
  } catch {
    return { title: 'Route Not Found | Roady' };
  }
}

export default async function RouteDetailPage({ params }: PageProps) {
  let raw: string;
  try {
    raw = getRouteRaw(params.slug);
  } catch {
    return notFound();
  }

  const { data } = matter(raw);
  const frontmatter = data as RouteFrontmatter;

  // Bind frontmatter stops into RouteSummary so they always render
  // (inline JSX array props in MDX can be unreliable with next-mdx-remote/rsc)
  const titleParts = frontmatter.title.split('→');
  const routeStart = titleParts[0]?.trim() ?? '';
  const routeEnd = titleParts[1]?.trim() ?? '';
  const BoundRouteSummary = (props: Record<string, unknown>) => (
    <RouteSummary
      start={(props.start as string) || routeStart}
      end={(props.end as string) || routeEnd}
      stops={frontmatter.stops ?? []}
    />
  );

  const { content } = await compileMDX({
    source: raw,
    components: { ...mdxComponents, RouteSummary: BoundRouteSummary },
    options: { parseFrontmatter: true },
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      {/* Hero */}
      <div className="relative w-full" style={{ height: '420px' }}>
        <img
          src={frontmatter.heroImage}
          alt={frontmatter.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 pb-8">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            {frontmatter.region}
          </p>
          <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight">
            {frontmatter.title}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {frontmatter.miles} miles · {frontmatter.duration} · {frontmatter.stopsCount} stops
          </p>
        </div>
      </div>

      {/* Quick stats bar */}
      {(() => {
        const TAG_COLORS: Record<string, { bg: string; color: string }> = {
          Wine:         { bg: 'rgba(147,51,234,0.1)',  color: '#7c3aed' },
          Scenic:       { bg: 'rgba(55,138,221,0.1)',  color: '#378ADD' },
          Food:         { bg: 'rgba(239,159,39,0.12)', color: '#d97706' },
          Culture:      { bg: 'rgba(147,51,234,0.1)',  color: '#9333ea' },
          Nature:       { bg: 'rgba(88,204,2,0.1)',    color: '#46a302' },
          Adventure:    { bg: 'rgba(216,90,48,0.1)',   color: '#D85A30' },
          Coastal:      { bg: 'rgba(20,184,166,0.1)',  color: '#0d9488' },
          Desert:       { bg: 'rgba(234,179,8,0.12)',  color: '#a16207' },
          Architecture: { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1' },
          Art:          { bg: 'rgba(236,72,153,0.1)',  color: '#db2777' },
          Mountains:    { bg: 'rgba(55,138,221,0.1)',  color: '#378ADD' },
          History:      { bg: 'rgba(180,83,9,0.1)',    color: '#b45309' },
          Beach:        { bg: 'rgba(20,184,166,0.1)',  color: '#0d9488' },
        };
        return (
          <div className="border-b" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
            <div className="max-w-3xl mx-auto px-6 pt-4 pb-3">
              {/* Row 1: Stats */}
              <div className="flex items-center gap-6 flex-wrap mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛣️</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Distance</p>
                    <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{frontmatter.miles} miles</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Drive time</p>
                    <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{frontmatter.duration}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗺️</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Stops</p>
                    <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{frontmatter.stopsCount} stops</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-lg">📌</span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Region</p>
                    <p className="text-sm font-bold" style={{ color: '#1B2D45' }}>{frontmatter.region}</p>
                  </div>
                </div>
              </div>
              {/* Row 2: Tags */}
              <div className="flex gap-2 flex-wrap">
                {(frontmatter.tags ?? []).map((tag) => {
                  const style = TAG_COLORS[tag] ?? { bg: 'rgba(88,204,2,0.1)', color: '#46a302' };
                  return (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: style.bg, color: style.color }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-28">
        {/* Back link */}
        <Link
          href="/destinations"
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 flex items-center gap-1 transition-colors"
        >
          ← All road trips
        </Link>

        {/* MDX body */}
        <div className="prose prose-lg max-w-none" style={{ color: '#374151' }}>
          {content}
        </div>
      </div>

      {/* Sticky plan CTA */}
      {(() => {
        const titleStart = frontmatter.title.split('→')[0]?.trim() ?? '';
        const titleEnd = frontmatter.title.split('→')[1]?.trim() ?? frontmatter.title;
        const stopNames = frontmatter.stopNames ?? [];
        const customizeUrl = `/?end=${encodeURIComponent(titleEnd)}`;
        const allPoints = [titleStart, ...stopNames, titleEnd];
        return (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 border-t gap-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold mb-0.5" style={{ color: '#1B2D45' }}>Ready to drive this route?</p>
              <div className="flex items-center gap-1 flex-wrap">
                {allPoints.map((point, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-xs font-semibold truncate max-w-[120px]" style={{ color: i === 0 ? '#46a302' : i === allPoints.length - 1 ? '#1B2D45' : '#6b7280' }}>
                      {i === 0 ? '🚗 ' : ''}{i === allPoints.length - 1 ? '🏁 ' : ''}{point}
                    </span>
                    {i < allPoints.length - 1 && <span className="text-gray-300 text-xs flex-shrink-0">›</span>}
                  </span>
                ))}
              </div>
            </div>
            <a
              href={customizeUrl}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#58CC02', color: '#ffffff' }}
            >
              Customize this trip →
            </a>
          </div>
        );
      })()}
    </div>
  );
}
