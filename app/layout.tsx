import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: 'Roady — Your California Road Trip, Reimagined',
  description: 'AI-powered California road trip planner with hidden gems, insider tips, and local knowledge.',
  metadataBase: new URL('https://heyroady.com'),
  openGraph: {
    title: 'Roady — Your California Road Trip, Reimagined',
    description: 'AI-powered California road trip planner with hidden gems, insider tips, and local knowledge.',
    url: 'https://heyroady.com',
    siteName: 'Roady',
    images: [{ url: '/roady-logo.png', width: 800, alt: 'Roady — California Road Trip Planner' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roady — Your California Road Trip, Reimagined',
    description: 'AI-powered California road trip planner with hidden gems, insider tips, and local knowledge.',
    images: ['/roady-logo.png'],
  },
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
      <body>
        {children}
        {/* Google Analytics GA4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-WNHQYCWFEK" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-WNHQYCWFEK');
        `}</Script>
        <Script id="travelpayouts" strategy="afterInteractive">{`
          (function () {
            var script = document.createElement("script");
            script.async = 1;
            script.src = 'https://emrldco.com/NTE5ODUw.js?t=519850';
            document.head.appendChild(script);
          })();
        `}</Script>
      </body>
    </html>
  );
}
