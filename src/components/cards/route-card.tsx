import Link from "next/link";
import { MapPin, Mountain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RouteCardProps {
  name: string;
  location: string;
  distance: string;
  elevationGain: string;
  season: string;
  status: "available" | "coming-soon";
  href?: string;
  className?: string;
}

/**
 * Route card with mountain icon, metadata stats, and status badge.
 * Sourced from 21st.dev "feature card horizontal" and "item card with stats" patterns,
 * adapted to Strange Grounds design system.
 */
export function RouteCard({
  name,
  location,
  distance,
  elevationGain,
  season,
  status,
  href,
  className,
}: RouteCardProps) {
  const content = (
    <div
      data-skeleton
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card transition-all hover:border-accent/30 hover:shadow-sm",
        href && "cursor-pointer",
        className
      )}
    >
      {/* SKELETON — Ashton will source final route card design */}
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
              <Mountain size={16} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={10} />
                <span>{location}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {status === "coming-soon" ? "Coming soon" : "Available"}
          </Badge>
        </div>
      </div>

      {/* Stats + season */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span>{distance}</span>
          <span className="text-border">|</span>
          <span>{elevationGain}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Season: {season}
          </span>
          <ArrowRight size={14} className="text-muted-foreground/50" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export type { RouteCardProps };
