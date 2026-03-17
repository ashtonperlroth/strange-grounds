import { cn } from "@/lib/utils";

interface ConditionsGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive grid layout for safety condition cards.
 * 4 columns desktop, 2 tablet, 1 mobile.
 */
export function ConditionsGrid({ children, className }: ConditionsGridProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Conditions
      </h2>
      <div
        data-testid="safety-cards-grid"
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
