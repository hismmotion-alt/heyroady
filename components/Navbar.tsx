'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  variant?: 'default' | 'figmaWeb';
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
  variant = 'figmaWeb',
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
  const figmaDropdownRef = useRef<HTMLDivElement>(null);
  const compactDropdownRef = useRef<HTMLDivElement>(null);
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
      const target = e.target as Node;
      const isInsideFigmaMenu = figmaDropdownRef.current?.contains(target);
      const isInsideCompactMenu = compactDropdownRef.current?.contains(target);

      if (!isInsideFigmaMenu && !isInsideCompactMenu) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const positionClass = fixed ? 'fixed top-0 left-0 right-0 z-50' : '';
  const isFigmaWeb = variant === 'figmaWeb';
  const standardLinks = [
    { label: 'Where to go', href: '/where-to-go' },
    { label: 'How it works', href: '/#how-it-works' },
    ...(user ? [{ label: 'My Trips', href: '/my-trips' }] : []),
  ];
  const figmaLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Where to go', href: '/where-to-go' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#save-share' },
  ];
  const resolvedLinks = navLinks ?? (isFigmaWeb ? figmaLinks : standardLinks);

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }
    router.push(primaryHref);
  };

  const figmaNavWidths = [80, 112, 113, 62];

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

  const renderFigmaNavLink = (link: { label: string; href: string }, index: number) => {
    const classes = 'block h-[25px] shrink-0 whitespace-nowrap text-[18px] font-normal leading-[normal] text-[#141046] transition-colors hover:text-[#25AB45]';
    const linkStyle = { width: figmaNavWidths[index] ?? 'auto' };
    if (link.href.startsWith('/#') || link.href.startsWith('#')) {
      return (
        <a key={link.label} href={link.href} className={classes} style={linkStyle}>
          {link.label}
        </a>
      );
    }
    return (
      <Link key={link.label} href={link.href} className={classes} style={linkStyle}>
        {link.label}
      </Link>
    );
  };

  const renderPrimaryButton = (label: string, figma = false) => (
    <button
      onClick={handlePrimaryAction}
      className={
        figma
          ? 'roady-cta-shadow relative h-[52.43px] w-[199.13px] rounded-[18px] text-[18px] font-normal leading-[normal] text-white transition-all hover:opacity-90'
          : `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 ${
              isFigmaWeb ? 'max-[420px]:h-10 max-[420px]:w-10 max-[420px]:px-0' : ''
            }`
      }
      style={{ backgroundColor: figma ? '#25AB45' : '#1B2D45' }}
      aria-label={label}
    >
      <span className={figma ? 'absolute left-[25px] top-[12px] h-[27px] w-[130px] whitespace-nowrap text-left' : isFigmaWeb ? 'max-[420px]:sr-only' : undefined}>
        {label}
      </span>
      {figma && (
        <svg className="absolute left-[160px] top-[20px] h-[12px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 16 12">
          <path d="M1 6h13" strokeLinecap="round" />
          <path d="m9.5 1 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!figma && isFigmaWeb && (
        <svg className="hidden h-4 w-4 max-[420px]:block" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 16 12">
          <path d="M1 6h13" strokeLinecap="round" />
          <path d="m9.5 1 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );

  return (
    <nav
      className={`${positionClass} border-b ${isFigmaWeb ? '' : 'backdrop-blur-md'} ${className}`}
      style={{
        backgroundColor: isFigmaWeb ? '#ffffff' : 'rgba(255,255,255,0.95)',
        borderColor: isFigmaWeb ? 'rgba(48,48,48,0.1)' : 'rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {isFigmaWeb && (
        <div
          className="relative mx-auto hidden h-16 max-w-[1440px] min-[1220px]:block"
          style={{ fontFamily: 'var(--font-poppins), Poppins, system-ui, sans-serif' }}
        >
          <a
            href={logoHref}
            className="absolute left-[28px] top-[10px] block h-[44px] w-[78px] overflow-hidden"
            aria-label="Roady home"
          >
            <img
              src="/roady-logo.png"
              alt="Roady"
              className="absolute max-w-none"
              style={{
                height: '173.68%',
                width: '147.82%',
                left: '-19.43%',
                top: '-31.58%',
              }}
            />
          </a>

          <div
            className="absolute flex w-[545px] items-center gap-[30px]"
            style={{ left: 'calc(50% - 290px)', top: 20, lineHeight: 'normal' }}
          >
            {extraLinks}
            {resolvedLinks.map(renderFigmaNavLink)}
          </div>

          <div className="absolute right-[52px] top-[6px] flex h-[52.43px] w-[296.13px] items-center gap-[19px]">
            {user ? (
              <>
                <div className="relative" ref={figmaDropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    title="Account"
                    className="flex h-[52.43px] items-center text-[18px] font-normal leading-[normal] text-[#141046] transition-colors hover:text-[#25AB45]"
                  >
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="h-9 w-9 rounded-full border-2 border-gray-200 transition-colors hover:border-[#25AB45]"
                      />
                    ) : (
                      <span>Account</span>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                      <a
                        href="/my-trips"
                        className="flex items-center px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#25AB45]"
                        onClick={() => setDropdownOpen(false)}
                      >
                        My Trips
                      </a>
                      <button
                        onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                        className="w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-red-500"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
                {renderPrimaryButton(signedInPrimaryLabel, true)}
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="flex h-[52.43px] w-[78px] items-center text-[18px] font-normal leading-[normal] text-[#141046] transition-colors hover:text-[#25AB45]"
                >
                  Log in
                </a>
                {renderPrimaryButton(primaryLabel, true)}
              </>
            )}
          </div>
        </div>
      )}

      <div className={`${isFigmaWeb ? 'min-[1220px]:hidden w-full max-w-full' : 'max-w-7xl mx-auto'} relative px-6 h-16 flex items-center justify-between gap-6`}>

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
        <div className={`flex items-center gap-3 flex-shrink-0 ${isFigmaWeb ? 'absolute right-6 top-1/2 -translate-y-1/2' : ''}`}>
          {user ? (
            <>
              <div className="relative" ref={compactDropdownRef}>
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
                className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#1B2D45' }}
                onClick={handlePrimaryAction}
              >
                {signedInPrimaryLabel}
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className={`${isFigmaWeb ? 'hidden sm:inline' : ''} text-sm font-semibold text-gray-500 hover:text-[#1B2D45] transition-colors`}
              >
                Log in
              </a>
              {renderPrimaryButton(primaryLabel)}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
