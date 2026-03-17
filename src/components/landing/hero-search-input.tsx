import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { MapPin, ArrowRight } from "lucide-react";

interface HeroSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSubmit?: () => void;
  submitTestId?: string;
}

/**
 * Hero search input with embedded location pin icon and arrow-right submit button.
 * Sourced from 21st.dev "Search input with icon and button" pattern,
 * adapted to Strange Grounds design system.
 */
const HeroSearchInput = forwardRef<HTMLInputElement, HeroSearchInputProps>(
  ({ className, onSubmit, submitTestId, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-4 text-muted-foreground">
          <MapPin size={18} strokeWidth={2} />
        </div>
        <input
          ref={ref}
          type="text"
          className={cn(
            "flex h-12 w-full rounded-lg border border-border bg-white pe-14 ps-11 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground/70",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />
        <button
          type="submit"
          className="absolute inset-y-0 end-0 flex h-full items-center pe-2"
          aria-label="Submit search"
          data-testid={submitTestId}
          onClick={onSubmit}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-primary-foreground transition-colors hover:bg-foreground/90">
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        </button>
      </div>
    );
  }
);

HeroSearchInput.displayName = "HeroSearchInput";

export { HeroSearchInput };
