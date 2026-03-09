'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mountain, User, Bell, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { DateRangePicker } from '@/components/planning/DateRangePicker';
import { ActivitySelector } from '@/components/planning/ActivitySelector';
import { GenerateButton } from '@/components/planning/GenerateButton';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMonitor = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
  };

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 768) setMenuOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <>
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4"
        role="banner"
      >
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-stone-800">
            Strange Grounds
          </span>
        </div>

        {/* Desktop controls */}
        <div className="hidden items-center gap-2 px-4 md:flex">
          <LocationSearch />
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <DateRangePicker />
          <div className="h-4 w-px bg-stone-200" aria-hidden="true" />
          <ActivitySelector />
          <div className="h-4 w-px bg-stone-200" aria-hidden="true" />
          <GenerateButton />
          <div className="h-4 w-px bg-stone-200" aria-hidden="true" />

          <button
            type="button"
            onClick={handleMonitor}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            title="Monitor conditions"
            aria-label="Monitor conditions"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>

          {user ? (
            <Link
              href="/trips"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              title="Saved trips"
              aria-label="Saved trips"
            >
              <User className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-7 items-center justify-center rounded-full bg-stone-100 px-3 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      <div
        className={cn(
          'overflow-hidden border-b border-stone-200 bg-white transition-[max-height,opacity] duration-300 ease-out md:hidden',
          menuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 border-b-0 opacity-0',
        )}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="space-y-3 px-4 py-3">
          <LocationSearch />
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker />
            <ActivitySelector />
          </div>
          <div className="flex items-center gap-2">
            <GenerateButton />
            <button
              type="button"
              onClick={handleMonitor}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Monitor conditions"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
            {user ? (
              <Link
                href="/trips"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                aria-label="Saved trips"
              >
                <User className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex h-7 items-center justify-center rounded-full bg-stone-100 px-3 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        title="Sign up for condition alerts"
        description="Create a free account to monitor conditions and receive alerts for your trips."
      />
    </>
  );
}
