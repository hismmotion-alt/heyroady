import type { Metadata } from 'next';
import WhereToGoPageClient from '@/components/where-to-go/WhereToGoPageClient';

export const metadata: Metadata = {
  title: 'Where to go | Roady',
  description: 'Browse destinations worth driving to with Roady, then start a custom California road trip from your pick.',
};

export default function WhereToGoPage() {
  return <WhereToGoPageClient />;
}
