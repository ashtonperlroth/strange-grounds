"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeProps {
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
}

export function ScrollFade({
  children,
  className,
  direction = "horizontal",
}: ScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (direction === "horizontal") {
      setShowStart(el.scrollLeft > 0);
      setShowEnd(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    } else {
      setShowStart(el.scrollTop > 0);
      setShowEnd(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
    }
  }, [direction]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const isHorizontal = direction === "horizontal";

  return (
    <div className={cn("relative", className)}>
      {showStart && (
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            isHorizontal
              ? "inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent"
              : "inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent"
          )}
        />
      )}
      <div
        ref={scrollRef}
        className={cn(
          "scrollbar-none",
          isHorizontal ? "overflow-x-auto" : "overflow-y-auto"
        )}
      >
        {children}
      </div>
      {showEnd && (
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            isHorizontal
              ? "inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
              : "inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent"
          )}
        />
      )}
    </div>
  );
}
