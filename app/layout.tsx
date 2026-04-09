import type { Metadata } from 'next';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: 'Roady — Your California Road Trip, Reimagined',
  description: 'AI-powered California road trip planner with hidden gems, insider tips, and local knowledge.',
  icons: {
    icon: '/roady-icon.png',
    apple: '/roady-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/roady-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
