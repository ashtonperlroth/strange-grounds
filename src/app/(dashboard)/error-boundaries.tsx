'use client';

import { type ReactNode } from 'react';
import {
  ErrorBoundary,
  MapErrorFallback,
  BriefingPanelErrorFallback,
} from '@/components/layout/ErrorBoundary';

export function MapErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(reset) => <MapErrorFallback reset={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}

export function BriefingPanelErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(reset) => <BriefingPanelErrorFallback reset={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}
