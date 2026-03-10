/**
 * Plausible analytics helper for custom events.
 * Events are no-op if Plausible script hasn't loaded (e.g. ad block, dev).
 */

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string> }
    ) => void;
  }
}

export function trackGenerateBriefing(hasRoute: boolean) {
  if (typeof window !== "undefined") {
    window.plausible?.("Generate Briefing", {
      props: { type: hasRoute ? "route" : "point" },
    });
  }
}

export function trackImportGPX() {
  if (typeof window !== "undefined") {
    window.plausible?.("Import GPX");
  }
}

export function trackClonePopularRoute(routeName: string) {
  if (typeof window !== "undefined") {
    window.plausible?.("Clone Popular Route", { props: { route: routeName } });
  }
}

export function trackSaveTrip() {
  if (typeof window !== "undefined") {
    window.plausible?.("Save Trip");
  }
}
