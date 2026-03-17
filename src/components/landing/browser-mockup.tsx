import { cn } from "@/lib/utils";

interface BrowserMockupProps {
  url?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * macOS-style browser window mockup frame.
 * Sourced from 21st.dev "Browser Preview" pattern,
 * adapted to Strange Grounds design system.
 */
export function BrowserMockup({
  url = "strangegrounds.com/app",
  children,
  className,
}: BrowserMockupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className
      )}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
          <div className="h-3 w-3 rounded-full bg-border" />
        </div>
        <div className="ml-4 flex-1 rounded-md bg-muted px-3 py-1">
          <span className="font-mono text-xs text-muted-foreground">
            {url}
          </span>
        </div>
      </div>
      {/* Content area */}
      <div>{children}</div>
    </div>
  );
}
