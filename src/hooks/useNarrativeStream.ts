'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface NarrativeStreamState {
  streamedText: string;
  isStreaming: boolean;
  streamError: string | null;
}

export function useNarrativeStream(
  briefingId: string | null,
  pipelineStatus: string | null,
) {
  const [state, setState] = useState<NarrativeStreamState>({
    streamedText: '',
    isStreaming: false,
    streamError: null,
  });
  const streamStartedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastBriefingIdRef = useRef<string | null>(null);

  if (briefingId !== lastBriefingIdRef.current) {
    lastBriefingIdRef.current = briefingId;
    streamStartedRef.current = false;
    setState({ streamedText: '', isStreaming: false, streamError: null });
  }

  useEffect(() => {
    if (
      !briefingId ||
      pipelineStatus !== 'ready_for_synthesis' ||
      streamStartedRef.current
    ) {
      return;
    }

    streamStartedRef.current = true;
    const abortController = new AbortController();
    abortRef.current = abortController;

    setState({ streamedText: '', isStreaming: true, streamError: null });

    (async () => {
      try {
        const response = await fetch('/api/stream-narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefingId }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          setState(prev => ({
            ...prev,
            isStreaming: false,
            streamError: errorText || `HTTP ${response.status}`,
          }));
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          setState(prev => ({ ...prev, isStreaming: false }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setState(prev => ({ ...prev, isStreaming: false }));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                setState(prev => ({ ...prev, isStreaming: false }));
                return;
              }
              if (data.error) {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  streamError: data.error,
                }));
                return;
              }
              if (data.text) {
                setState(prev => ({
                  ...prev,
                  streamedText: prev.streamedText + data.text,
                }));
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        setState(prev => ({ ...prev, isStreaming: false }));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState(prev => ({
          ...prev,
          isStreaming: false,
          streamError:
            err instanceof Error ? err.message : 'Stream connection failed',
        }));
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [briefingId, pipelineStatus]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    streamStartedRef.current = false;
    setState({ streamedText: '', isStreaming: false, streamError: null });
  }, []);

  return { ...state, reset };
}
