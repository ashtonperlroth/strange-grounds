"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MapPin, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSubmit?: () => void;
  submitTestId?: string;
}

const PLACEHOLDER_EXAMPLES = [
  "3-day loop from Whitney Portal...",
  "Weekend ski tour near Bozeman...",
  "Day hike in the Enchantments...",
  "Backpacking the Teton Crest Trail...",
  "Trail running near Ouray, Colorado...",
];

/**
 * Hero search input with animated cycling placeholder text,
 * embedded location pin icon, and arrow-right submit button.
 * Adapted from 21st.dev "animated-ai-input" pattern.
 */
const HeroSearchInput = forwardRef<HTMLInputElement, HeroSearchInputProps>(
  ({ className, onSubmit, submitTestId, value, ...props }, ref) => {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Typing animation effect
    useEffect(() => {
      const currentExample = PLACEHOLDER_EXAMPLES[placeholderIndex];

      if (isTyping) {
        if (displayedPlaceholder.length < currentExample.length) {
          timeoutRef.current = setTimeout(() => {
            setDisplayedPlaceholder(
              currentExample.slice(0, displayedPlaceholder.length + 1)
            );
          }, 40);
        } else {
          // Pause at full text, then start erasing
          timeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 2000);
        }
      } else {
        if (displayedPlaceholder.length > 0) {
          timeoutRef.current = setTimeout(() => {
            setDisplayedPlaceholder(
              displayedPlaceholder.slice(0, -1)
            );
          }, 20);
        } else {
          // Move to next example
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
          setIsTyping(true);
        }
      }

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [displayedPlaceholder, isTyping, placeholderIndex]);

    const hasValue = typeof value === "string" && value.length > 0;

    return (
      <div className={cn("relative w-full", className)}>
        {/* Outer container with warm styling */}
        <div className="relative rounded-lg border border-border bg-white shadow-sm transition-all focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-4 text-muted-foreground">
            <MapPin size={18} strokeWidth={2} />
          </div>

          <input
            ref={ref}
            type="text"
            value={value}
            className={cn(
              "flex h-14 w-full rounded-lg bg-transparent pe-14 ps-11 text-sm",
              "placeholder:text-transparent",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            {...props}
          />

          {/* Animated placeholder overlay */}
          <AnimatePresence mode="wait">
            {!hasValue && (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute inset-y-0 start-11 flex items-center text-sm text-muted-foreground/70"
              >
                Describe your trip — e.g., {displayedPlaceholder}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  className="ml-px inline-block h-4 w-px bg-muted-foreground/50"
                />
              </motion.span>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="absolute inset-y-0 end-0 flex h-full items-center pe-2"
            aria-label="Submit search"
            data-testid={submitTestId}
            onClick={onSubmit}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-primary-foreground transition-colors hover:bg-foreground/90">
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    );
  }
);

HeroSearchInput.displayName = "HeroSearchInput";

export { HeroSearchInput };
