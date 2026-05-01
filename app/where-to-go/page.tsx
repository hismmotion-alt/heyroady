import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Where to go | Roady',
  description: 'Roady travel inspiration and destination ideas.',
};

export default function WhereToGoPage() {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <Navbar />

      <main className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-6 pt-28">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#EC501E]">Roady</p>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-[#141046] md:text-6xl">
          Where to go
        </h1>
        <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-[#818395]">
          Fresh destination ideas are coming here next.
        </p>
      </main>
    </div>
  );
}
