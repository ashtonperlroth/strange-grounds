'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((reset: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
          <AlertTriangle className="size-6 text-stone-400" />
          <p className="text-sm text-stone-600">Something went wrong.</p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function MapErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-stone-100 text-center">
      <AlertTriangle className="size-8 text-stone-400" />
      <p className="text-sm font-medium text-stone-700">Map failed to load.</p>
      <p className="text-xs text-stone-500">Please refresh the page to try again.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
      >
        <RefreshCw className="size-3" />
        Retry
      </button>
    </div>
  );
}

export function BriefingPanelErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-8 text-amber-500" />
      <p className="text-sm font-medium text-stone-700">Briefing display error.</p>
      <p className="text-xs text-stone-500">Try regenerating the briefing.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
      >
        <RefreshCw className="size-3" />
        Retry
      </button>
    </div>
  );
}

export function ConditionCardErrorFallback({
  category,
  reset,
}: {
  category: string;
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-stone-400" />
          <span className="text-sm text-stone-500">
            Error loading {category}
          </span>
        </div>
        <button
          onClick={reset}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
