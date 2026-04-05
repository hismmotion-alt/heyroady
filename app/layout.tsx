import type { Metadata } from 'next';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: 'Roady — Your California Road Trip, Reimagined',
  description: 'AI-powered California road trip planner with hidden gems, insider tips, and local knowledge.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
