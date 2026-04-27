'use client';

import { useState, useEffect, useRef } from 'react';
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
  navLinks?: Array<{ label: string; href: string }>;
  onPrimaryAction?: () => void;
  primaryHref?: string;
  primaryLabel?: string;
  signedInPrimaryLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Navbar({
  fixed = true,
  logoHeight = 48,
  logoOffsetY = 0,
  logoHref = '/',
  extraLinks,
  navLinks,
  onPrimaryAction,
  primaryHref = '/chat',
  primaryLabel = 'Start planning',
  signedInPrimaryLabel = 'New trip',
  className = '',
  style,
}: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const positionClass = fixed ? 'fixed top-0 left-0 right-0 z-50' : '';
  const resolvedLinks = navLinks ?? [
    { label: 'Destinations', href: '/destinations' },
    { label: 'How it works', href: '/#how-it-works' },
    ...(user ? [{ label: 'My Trips', href: '/my-trips' }] : []),
  ];

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }
    router.push(primaryHref);
  };

  const renderNavLink = (link: { label: string; href: string }) => {
    const classes = 'text-sm font-semibold text-gray-500 hover:text-[#1B2D45] transition-colors';
    if (link.href.startsWith('/#') || link.href.startsWith('#')) {
      return (
        <a key={link.label} href={link.href} className={classes}>
          {link.label}
        </a>
      );
    }
    return (
      <Link key={link.label} href={link.href} className={classes}>
        {link.label}
      </Link>
    );
  };

  return (
    <nav
      className={`${positionClass} backdrop-blur-md border-b ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.06)', ...style }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <a href={logoHref} className="flex-shrink-0">
          <img
            src="/roady-logo.png"
            alt="Roady"
            style={{ height: logoHeight, width: 'auto', transform: `translateY(${logoOffsetY}px)` }}
          />
        </a>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-7 flex-1 justify-center">
          {extraLinks}
          {resolvedLinks.map(renderNavLink)}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {user ? (
            <>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  title="Account"
                  className="flex items-center gap-2"
                >
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-[#58CC02] transition-colors"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-500 hover:text-[#1B2D45] transition-colors">
                      Account
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-50">
                    <a
                      href="/my-trips"
                      className="flex items-center px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#46a302] transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Trips
                    </a>
                    <button
                      onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-500 transition-colors border-t border-gray-100"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handlePrimaryAction}
                className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#1B2D45' }}
              >
                {signedInPrimaryLabel}
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="text-sm font-semibold text-gray-500 hover:text-[#1B2D45] transition-colors"
              >
                Log in
              </a>
              <button
                onClick={handlePrimaryAction}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#1B2D45' }}
              >
                {primaryLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
