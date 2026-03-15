'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';

const SEVERITY_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🔴',
};

/**
 * Queries unread condition alerts for the current user on mount and shows
 * a toast for each (up to 3). Marks them read immediately so they don't
 * appear again on the next page load.
 */
export function useUnacknowledgedAlerts() {
  const hasShownRef = useRef(false);
  const { data: alerts } = trpc.alerts.getUnread.useQuery(undefined, {
    staleTime: 60_000,
  });
  const markRead = trpc.alerts.markRead.useMutation();

  useEffect(() => {
    if (!alerts || alerts.length === 0 || hasShownRef.current) return;
    hasShownRef.current = true;

    const toShow = alerts.slice(0, 3);
    for (const alert of toShow) {
      const emoji = SEVERITY_EMOJI[alert.severity] ?? 'ℹ️';
      toast(
        `${emoji} ${alert.title}`,
        {
          description: alert.message,
          duration: 8_000,
        },
      );
    }

    // Mark all fetched alerts as read
    markRead.mutate({ ids: alerts.map((a) => a.id) });
  }, [alerts, markRead]);
}
