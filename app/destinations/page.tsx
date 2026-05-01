// app/destinations/page.tsx
import type { Metadata } from 'next';
import RouteGuidesIndex from '@/components/route/RouteGuidesIndex';

export const metadata: Metadata = {
  title: 'California Road Trip Guides | Roady',
  description: 'Explore the best California road trips — from the Pacific Coast Highway to Wine Country. Curated guides with stops, tips, and hidden gems.',
  openGraph: {
    title: 'California Road Trip Guides | Roady',
    description: 'Explore the best California road trips — from the Pacific Coast Highway to Wine Country. Curated guides with stops, tips, and hidden gems.',
    url: 'https://heyroady.com/destinations',
    images: [{ url: '/roady-logo.png', alt: 'Roady — California Road Trip Guides' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California Road Trip Guides | Roady',
    description: 'Explore the best California road trips — from the Pacific Coast Highway to Wine Country.',
    images: ['/roady-logo.png'],
  },
};

export default function DestinationsPage() {
  return <RouteGuidesIndex />;
}
