import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Trips | Roady',
  robots: { index: false, follow: false },
};

export default function MyTripsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
