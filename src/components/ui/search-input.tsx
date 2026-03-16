import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon?: React.ReactNode;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          {icon ?? <MapPin className="h-4 w-4" />}
        </div>
        <input
          ref={ref}
          type="text"
          className={cn(
            "h-10 w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm shadow-xs transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
