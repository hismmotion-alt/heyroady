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

  const { content } = await compileMDX({
    source: raw,
    components: mdxComponents,
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

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        {/* Back link */}
        <Link
          href="/destinations"
          className="text-sm text-gray-400 hover:text-gray-600 mb-8 flex items-center gap-1 transition-colors"
        >
          ← All road trips
        </Link>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-8">
          {(frontmatter.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* MDX body */}
        <div className="prose prose-lg max-w-none" style={{ color: '#374151' }}>
          {content}
        </div>
      </div>
    </div>
  );
}
