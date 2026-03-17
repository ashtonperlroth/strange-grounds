"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  "data-testid"?: string;
}

function SelectDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  className,
  triggerClassName,
  "data-testid": dataTestId,
}: SelectDropdownProps) {
  const [open, setOpen] = React.useState<boolean>(false);

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <div className={cn("min-w-[160px]", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            data-testid={dataTestId}
            className={cn(
              "w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20",
              triggerClassName
            )}
          >
            <span
              className={cn("truncate", !value && "text-muted-foreground")}
            >
              {selectedLabel ?? placeholder}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
          align="start"
        >
          <Command>
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onValueChange(
                        currentValue === value ? "" : currentValue
                      );
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    {value === option.value && (
                      <Check size={16} strokeWidth={2} className="ml-auto" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { SelectDropdown };
export type { SelectOption, SelectDropdownProps };
