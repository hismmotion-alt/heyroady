'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  fixed?: boolean;
  logoHeight?: number;
  logoOffsetY?: number;
  logoHref?: string;
  extraLinks?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Navbar({
  fixed = true,
  logoHeight = 56,
  logoOffsetY = 0,
  logoHref = '/',
  extraLinks,
  className = '',
  style,
}: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const positionClass = fixed ? 'fixed top-0 left-0 right-0 z-50' : '';

  return (
    <nav
      className={`${positionClass} backdrop-blur-md border-b ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.06)', ...style }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href={logoHref}>
          <img
            src="/roady-logo.png"
            alt="Roady"
            style={{ height: logoHeight, width: 'auto', transform: `translateY(${logoOffsetY}px)` }}
          />
        </a>

        <div className="flex items-center gap-4">
          {extraLinks}
          <Link
            href="/destinations"
            className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
          >
            Destinations
          </Link>
          {user ? (
            <>
              <a
                href="/my-trips"
                className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
              >
                My Trips
              </a>
              {user.user_metadata?.avatar_url ? (
                <button onClick={handleSignOut} title="Sign out">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-[#58CC02] transition-colors"
                  />
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="text-sm font-semibold text-gray-500 hover:text-[#46a302] transition-colors"
                >
                  Sign out
                </button>
              )}
            </>
          ) : (
            <a
              href="/login"
              className="text-sm font-bold px-4 py-2 rounded-lg border-2 transition-all duration-200 hover:border-[#58CC02] hover:text-[#46a302]"
              style={{ borderColor: '#E5E7EB', color: '#1B2D45' }}
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
