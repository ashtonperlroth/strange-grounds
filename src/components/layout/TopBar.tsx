'use client';

import { useState } from 'react';
import { Mountain, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { LocationSearch } from '@/components/planning/LocationSearch';
import { DateRangePicker } from '@/components/planning/DateRangePicker';
import { ActivitySelector } from '@/components/planning/ActivitySelector';
import { GenerateButton } from '@/components/planning/GenerateButton';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';

export function TopBar() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleMonitor = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-tight text-stone-800">
            Strange Grounds
          </span>
        </div>

        <div className="flex items-center gap-2 px-4">
          <LocationSearch />
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker />

          <div className="h-4 w-px bg-stone-200" />

          <ActivitySelector />

          <div className="h-4 w-px bg-stone-200" />

          <GenerateButton />

          <div className="h-4 w-px bg-stone-200" />

          <button
            type="button"
            onClick={handleMonitor}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            title="Monitor conditions"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>

          {user ? (
            <Link
              href="/dashboard"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              title="Account"
            >
              <User className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-7 items-center justify-center rounded-full bg-stone-100 px-3 text-xs font-medium text-stone-600 hover:bg-stone-200"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        title="Sign up for condition alerts"
        description="Create a free account to monitor conditions and receive alerts for your trips."
      />
    </>
  );
}
