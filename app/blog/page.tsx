import type { Metadata } from 'next';
import RouteGuidesIndex from '@/components/route/RouteGuidesIndex';

export const metadata: Metadata = {
  title: 'Roady Blog | Roady',
  description: 'Explore Roady road trip guides with curated stops, hidden gems, and local tips for each route.',
  openGraph: {
    title: 'Roady Blog | Roady',
    description: 'Explore Roady road trip guides with curated stops, hidden gems, and local tips for each route.',
    url: 'https://heyroady.com/blog',
    images: [{ url: '/roady-logo.png', alt: 'Roady Blog' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roady Blog | Roady',
    description: 'Explore Roady road trip guides with curated stops, hidden gems, and local tips for each route.',
    images: ['/roady-logo.png'],
  },
};

export default function BlogPage() {
  return <RouteGuidesIndex />;
}
