'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ConditionCardData {
  category: string;
  status: 'good' | 'caution' | 'concern' | 'unknown';
  summary: string;
  detail?: string;
}

interface BriefingConditions extends Record<string, unknown> {
  conditionCards?: ConditionCardData[];
}

interface Briefing {
  id: string;
  trip_id: string;
  narrative: string | null;
  conditions: BriefingConditions;
  raw_data: Record<string, unknown>;
  readiness: 'green' | 'yellow' | 'red' | null;
  share_token: string | null;
  created_at: string;
}

interface PollingState {
  briefing: Briefing | null;
  isLoading: boolean;
  error: string | null;
  elapsedSeconds: number;
  isTimedOut: boolean;
}

const TIMEOUT_SECONDS = 30;

let pollingState: PollingState = {
  briefing: null,
  isLoading: false,
  error: null,
  elapsedSeconds: 0,
  isTimedOut: false,
};
let listeners: Array<() => void> = [];
let activeInterval: ReturnType<typeof setInterval> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let activeBriefingId: string | null = null;
let startedAt: number | null = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: Partial<PollingState>) {
  pollingState = { ...pollingState, ...next };
  emitChange();
}

function stopPolling() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetState() {
  stopPolling();
  startedAt = null;
  activeBriefingId = null;
  setState({
    briefing: null,
    isLoading: false,
    error: null,
    elapsedSeconds: 0,
    isTimedOut: false,
  });
}

export function useBriefingPolling(briefingId: string | null) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.push(onStoreChange);
    return () => {
      listeners = listeners.filter((l) => l !== onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => pollingState, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (briefingId === activeBriefingId) return;

    stopPolling();
    activeBriefingId = briefingId;

    if (!briefingId) {
      setState({
        briefing: null,
        isLoading: false,
        error: null,
        elapsedSeconds: 0,
        isTimedOut: false,
      });
      return;
    }

    startedAt = Date.now();
    setState({
      briefing: null,
      isLoading: true,
      error: null,
      elapsedSeconds: 0,
      isTimedOut: false,
    });

    const supabase = createClient();

    const poll = async () => {
      const elapsed = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;

      if (elapsed >= TIMEOUT_SECONDS) {
        stopPolling();
        setState({
          isLoading: false,
          isTimedOut: true,
          error:
            'Briefing generation timed out. The pipeline may still be running — try regenerating.',
          elapsedSeconds: elapsed,
        });
        return;
      }

      const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('id', briefingId)
        .single();

      if (error) {
        console.error('Briefing poll error:', error);
        return;
      }

      if (data) {
        setState({ briefing: data as Briefing });
        if (data.narrative !== null) {
          stopPolling();
          setState({ isLoading: false, elapsedSeconds: elapsed });
        }
      }
    };

    timerInterval = setInterval(() => {
      if (!startedAt) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setState({ elapsedSeconds: elapsed });
    }, 1000);

    poll();
    activeInterval = setInterval(poll, 1000);

    return () => {
      stopPolling();
      activeBriefingId = null;
    };
  }, [briefingId]);

  return state;
}

export function resetBriefingPolling() {
  resetState();
}
