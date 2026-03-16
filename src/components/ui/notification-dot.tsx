import { cn } from "@/lib/utils";

interface NotificationDotProps {
  count?: number;
  className?: string;
}

export function NotificationDot({ count, className }: NotificationDotProps) {
  if (count !== undefined && count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-red-500 text-white",
        count !== undefined
          ? "min-w-[18px] px-1 py-0.5 text-[10px] font-bold leading-none"
          : "h-2 w-2",
        className
      )}
    >
      {count !== undefined ? (count > 99 ? "99+" : count) : null}
    </span>
  );
}
