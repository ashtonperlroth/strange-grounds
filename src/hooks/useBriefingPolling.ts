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
  bottom_line: string | null;
  readiness_rationale: string | null;
  conditions: BriefingConditions;
  raw_data: Record<string, unknown>;
  readiness: 'green' | 'yellow' | 'red' | null;
  share_token: string | null;
  pipeline_status: string | null;
  created_at: string;
}

interface PollingState {
  briefing: Briefing | null;
  isLoading: boolean;
  error: string | null;
  elapsedSeconds: number;
  isTimedOut: boolean;
  pipelineStatus: string | null;
}

const ROUTE_TIMEOUT_SECONDS = 180;
const POINT_TIMEOUT_SECONDS = 90;

let pollingState: PollingState = {
  briefing: null,
  isLoading: false,
  error: null,
  elapsedSeconds: 0,
  isTimedOut: false,
  pipelineStatus: null,
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
    pipelineStatus: null,
  });
}

export function useBriefingPolling(
  briefingId: string | null,
  options?: { isRoute?: boolean },
) {
  const isRoute = options?.isRoute ?? false;
  const timeoutSeconds = isRoute ? ROUTE_TIMEOUT_SECONDS : POINT_TIMEOUT_SECONDS;

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
        pipelineStatus: null,
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
      pipelineStatus: null,
    });

    const supabase = createClient();

    const poll = async () => {
      const elapsed = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;

      if (elapsed >= timeoutSeconds) {
        // Before declaring timeout, check if the pipeline is still actively running
        // by reading pipeline_status. If it's still updating, extend the timeout.
        const { data: check } = await supabase
          .from('briefings')
          .select('pipeline_status, narrative')
          .eq('id', briefingId)
          .single();

        if (check?.narrative !== null) {
          // Actually completed while we were checking
          const { data: fullData } = await supabase
            .from('briefings')
            .select('*')
            .eq('id', briefingId)
            .single();
          if (fullData) {
            setState({
              briefing: fullData as Briefing,
              isLoading: false,
              elapsedSeconds: elapsed,
              pipelineStatus: 'complete',
            });
          }
          stopPolling();
          return;
        }

        if (
          check?.pipeline_status &&
          check.pipeline_status !== 'complete' &&
          check.pipeline_status !== pollingState.pipelineStatus
        ) {
          // Pipeline is still making progress — don't timeout yet
          setState({
            elapsedSeconds: elapsed,
            pipelineStatus: check.pipeline_status,
          });
          return;
        }

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
        const briefing = data as Briefing;
        setState({
          briefing,
          pipelineStatus: briefing.pipeline_status ?? pollingState.pipelineStatus,
        });
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
  }, [briefingId, timeoutSeconds]);

  return state;
}

export function resetBriefingPolling() {
  resetState();
}
