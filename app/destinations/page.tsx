// app/destinations/page.tsx
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import RouteCard from '@/components/route/RouteCard';
import { getAllRoutes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'California Road Trip Guides | Roady',
  description: 'Explore the best California road trips — from the Pacific Coast Highway to Wine Country. Curated guides with stops, tips, and hidden gems.',
};

export default function DestinationsPage() {
  const routes = getAllRoutes();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#58CC02' }}>
            Explore
          </p>
          <h1 className="text-4xl font-extrabold mb-3" style={{ color: '#1B2D45' }}>
            California Road Trips
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Curated guides to the best drives in the state — with stops, hidden gems, and local tips for each route.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <RouteCard key={route.slug} route={route} />
          ))}
        </div>
      </div>
    </div>
  );
}
