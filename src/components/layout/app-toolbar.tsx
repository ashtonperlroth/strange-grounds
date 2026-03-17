"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { ColorfulButton } from "@/components/ui/colorful-button";
import { SelectDropdown } from "@/components/ui/select-dropdown";

import type { SelectOption } from "@/components/ui/select-dropdown";

const ACTIVITY_OPTIONS: SelectOption[] = ACTIVITY_TYPES.map((type) => ({
  value: type.toLowerCase().replace(/\s+/g, "-"),
  label: type,
}));

interface AppToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  onSearch?: (value: string) => void;
}

function AppToolbar({ className, onSearch, ...props }: AppToolbarProps) {
  const [activeActivity, setActiveActivity] = React.useState<string>(
    ACTIVITY_OPTIONS[0].value
  );

  return (
    <div
      className={cn(
        "w-full",
        "bg-background",
        "border border-border",
        "rounded-lg",
        "flex items-center gap-2 p-2",
        className
      )}
      {...props}
    >
      {/* Search Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          data-testid="location-search-hero"
          placeholder="Search location..."
          className="w-full h-9 pl-9 pr-4
            bg-secondary
            text-sm text-foreground
            placeholder:text-muted-foreground
            rounded-md focus:outline-none"
          onChange={(e) => onSearch?.(e.target.value)}
        />
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Activity Dropdown */}
      <SelectDropdown
        options={ACTIVITY_OPTIONS}
        value={activeActivity}
        onValueChange={setActiveActivity}
        placeholder="Activity type"
        className="min-w-[170px]"
        data-testid={`activity-tab-${activeActivity}`}
      />

      {/* Check Conditions Button */}
      <ColorfulButton
        data-testid="check-conditions-button"
        glowColor="#2D5016"
      >
        Check conditions
      </ColorfulButton>
    </div>
  );
}

export { AppToolbar };
