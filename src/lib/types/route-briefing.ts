import type { ConditionCardData } from "@/stores/briefing-store";

export interface RouteWalkthroughSegment {
  segmentOrder: number;
  mileRange: string;
  title: string;
  narrative: string;
  hazardLevel: string;
  keyCallouts: string[];
  timingAdvice: string | null;
}

export interface CriticalSection {
  segmentOrder: number;
  title: string;
  whyCritical: string;
  recommendation: string;
}

export interface AlternativeRoute {
  description: string;
  benefit: string;
}

export type OverallReadiness = "green" | "yellow" | "orange" | "red";

export interface RouteAwareBriefing {
  bottomLine: string;
  overallReadiness: OverallReadiness;

  routeWalkthrough: RouteWalkthroughSegment[];

  criticalSections: CriticalSection[];

  alternativeRoutes: AlternativeRoute[] | null;

  gearChecklist: string[];

  narrative: string;
  conditionCards: ConditionCardData[];
}

export interface RouteAwareSynthesisResult {
  bottomLine: string;
  overallReadiness: OverallReadiness;
  routeWalkthrough: RouteWalkthroughSegment[];
  criticalSections: CriticalSection[];
  alternativeRoutes: AlternativeRoute[] | null;
  gearChecklist: string[];
  narrative: string;
}
