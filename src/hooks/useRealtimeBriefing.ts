'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ConditionCardData {
  category: string;
  status: 'good' | 'caution' | 'concern' | 'unknown';
  summary: string;
  detail?: string;
}

interface BriefingConditions extends Record<string, unknown> {
  conditionCards?: ConditionCardData[];
}

export interface Briefing {
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

interface BriefingState {
  briefing: Briefing | null;
  isLoading: boolean;
  error: string | null;
  elapsedSeconds: number;
  pipelineStatus: string | null;
  progress: Record<string, unknown>;
}

const INITIAL_STATE: BriefingState = {
  briefing: null,
  isLoading: false,
  error: null,
  elapsedSeconds: 0,
  pipelineStatus: null,
  progress: {},
};

const ROUTE_TIMEOUT_SECONDS = 300;
const POINT_TIMEOUT_SECONDS = 120;

export function useRealtimeBriefing(
  briefingId: string | null,
  options?: { isRoute?: boolean },
) {
  const isRoute = options?.isRoute ?? false;
  const timeoutSeconds = isRoute ? ROUTE_TIMEOUT_SECONDS : POINT_TIMEOUT_SECONDS;

  const [state, setState] = useState<BriefingState>(INITIAL_STATE);
  const [trackedId, setTrackedId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastProgressRef = useRef<string>('{}');
  const lastProgressChangeRef = useRef<number>(0);

  if (briefingId !== trackedId) {
    setTrackedId(briefingId);
    if (!briefingId) {
      setState(INITIAL_STATE);
    } else {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        elapsedSeconds: 0,
        pipelineStatus: null,
        progress: {},
      }));
    }
  }

  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!briefingId) return;

    const supabase = createClient();
    startedAtRef.current = Date.now();
    lastProgressRef.current = '{}';
    lastProgressChangeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);

      setState(prev => {
        if (elapsed >= timeoutSeconds) {
          const staleDuration = Math.floor(
            (Date.now() - lastProgressChangeRef.current) / 1000,
          );
          if (staleDuration >= 30) {
            return {
              ...prev,
              elapsedSeconds: elapsed,
              error: 'Taking longer than expected. Still waiting...',
            };
          }
        }
        return { ...prev, elapsedSeconds: elapsed };
      });
    }, 1000);

    supabase
      .from('briefings')
      .select('*')
      .eq('id', briefingId)
      .single()
      .then(({ data }) => {
        if (data) {
          const briefing = data as Briefing;
          const isComplete = briefing.narrative !== null;
          const progress =
            (data as Record<string, unknown>).progress as
              | Record<string, unknown>
              | undefined;

          setState(prev => ({
            ...prev,
            briefing,
            pipelineStatus: briefing.pipeline_status,
            progress: progress ?? {},
            isLoading: !isComplete,
          }));

          if (isComplete) {
            channelRef.current?.unsubscribe();
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      });

    const channel = supabase
      .channel(`briefing-${briefingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'briefings',
          filter: `id=eq.${briefingId}`,
        },
        (payload) => {
          const updated = payload.new as Briefing & {
            progress?: Record<string, unknown>;
          };
          const isComplete = updated.narrative !== null;

          const progressStr = JSON.stringify(updated.progress ?? {});
          if (progressStr !== lastProgressRef.current) {
            lastProgressRef.current = progressStr;
            lastProgressChangeRef.current = Date.now();
          }

          setState(prev => ({
            ...prev,
            briefing: updated,
            pipelineStatus: updated.pipeline_status,
            progress: updated.progress ?? prev.progress,
            isLoading: !isComplete,
            error: isComplete ? null : prev.error,
          }));

          if (isComplete) {
            channel.unsubscribe();
            if (timerRef.current) clearInterval(timerRef.current);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [briefingId, timeoutSeconds]);

  const reset = useCallback(() => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { ...state, reset };
}
