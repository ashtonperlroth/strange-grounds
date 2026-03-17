import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface SafetyBannerProps {
  headline?: string;
  concerns: number;
  sourcesChecked: number;
  className?: string;
}

/**
 * Safety headline banner with concern/source counts.
 * Sourced from 21st.dev "Alert Banner" patterns,
 * adapted as a subtle card with status metadata.
 */
export function SafetyBanner({
  headline,
  concerns,
  sourcesChecked,
  className,
}: SafetyBannerProps) {
  return (
    <Card
      data-testid="ai-headline-card"
      className={cn("bg-card border-border", className)}
    >
      <CardContent className="pb-4 pt-4">
        <p className="text-sm italic text-muted-foreground">
          {headline || "Safety headline appears here after conditions are checked"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {concerns} concern{concerns !== 1 ? "s" : ""} &middot; {sourcesChecked} source{sourcesChecked !== 1 ? "s" : ""} checked
        </p>
      </CardContent>
    </Card>
  );
}
